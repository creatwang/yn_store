import { and, eq, inArray, isNull, sql } from "drizzle-orm"
import { generateId, getDb, productImage, productVariantProductImage } from "@my-store/db"
import { HTTPException } from "hono/http-exception"

export const imageService = {
  async listImages(productId: string) {
    const db = getDb()
    const images = await db
      .select()
      .from(productImage)
      .where(and(
        eq(productImage.product_id, productId),
        isNull(productImage.deleted_at),
      ))
      .orderBy(sql`${productImage.rank} asc`)
    return { images }
  },

  async createImage(productId: string, input: { url: string; rank?: number; metadata?: Record<string, unknown> }) {
    const db = getDb()
    const id = generateId("prodimg")
    const [created] = await db.insert(productImage).values({
      id,
      product_id: productId,
      url: input.url,
      rank: input.rank ?? 0,
      metadata: input.metadata ?? null,
      created_at: sql`now()`,
      updated_at: sql`now()`,
    }).returning()
    return { image: created }
  },

  /**
   * 对齐官方 batchImageVariantsWorkflow
   * POST /admin/products/:id/images/:imageId/variants/batch
   * body: { add: string[], remove: string[] }
   */
  async batchImageVariants(imageId: string, input: { add?: string[]; remove?: string[] }) {
    const db = getDb()

    if (input.add?.length) {
      const rows = input.add.map((variantId: string) => ({
        id: generateId("pvpi"),
        variant_id: variantId,
        image_id: imageId,
      }))
      await db.insert(productVariantProductImage).values(rows).onConflictDoNothing()
    }

    if (input.remove?.length) {
      await db.delete(productVariantProductImage).where(
        and(
          eq(productVariantProductImage.image_id, imageId),
          inArray(productVariantProductImage.variant_id, input.remove),
        )
      )
    }

    return { added: input.add ?? [], removed: input.remove ?? [] }
  },

  /**
   * 对齐官方 batchVariantImagesWorkflow
   * POST /admin/products/:id/variants/:variantId/images/batch
   * body: { add: string[], remove: string[] }
   */
  async batchVariantImages(variantId: string, input: { add?: string[]; remove?: string[] }) {
    const db = getDb()

    if (input.add?.length) {
      const rows = input.add.map((imageId: string) => ({
        id: generateId("pvpi"),
        variant_id: variantId,
        image_id: imageId,
      }))
      await db.insert(productVariantProductImage).values(rows).onConflictDoNothing()
    }

    if (input.remove?.length) {
      await db.delete(productVariantProductImage).where(
        and(
          eq(productVariantProductImage.variant_id, variantId),
          inArray(productVariantProductImage.image_id, input.remove),
        )
      )
    }

    return { added: input.add ?? [], removed: input.remove ?? [] }
  },

  async deleteImage(productId: string, imageId: string) {
    const db = getDb()
    await db.update(productImage)
      .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
      .where(and(
        eq(productImage.id, imageId),
        eq(productImage.product_id, productId),
      ))
    return { deleted: true }
  },
}
