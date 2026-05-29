import { and, eq, isNull, sql } from "drizzle-orm"
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

  async assignImageToVariants(imageId: string, variantIds: string[]) {
    const db = getDb()
    if (!variantIds?.length) return { success: true }

    const rows = variantIds.map((vid: string) => ({
      id: generateId("pvpi"),
      variant_id: vid,
      image_id: imageId,
    }))
    await db.insert(productVariantProductImage).values(rows)
    return { success: true }
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
