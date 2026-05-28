import { Hono } from "hono"
import { and, eq, isNull, sql } from "drizzle-orm"
import { generateId, getDb, productImage, productVariantProductImage } from "@my-store/db"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminProductImages = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/:productId/images", async (c) => {
    const db = getDb()
    const images = await db.select()
      .from(productImage)
      .where(and(
        eq(productImage.product_id, c.req.param("productId")),
        isNull(productImage.deleted_at)
      ))
      .orderBy(sql`${productImage.rank} asc`)
    return c.json({ images })
  })
  .post("/:productId/images", async (c) => {
    const db = getDb()
    const body = await c.req.json()
    const productId = c.req.param("productId")
    const { url, rank } = body
    if (!url) return c.json({ message: "url required" }, 400)

    const id = generateId("prodimg")
    const [created] = await db.insert(productImage).values({
      id,
      product_id: productId,
      url,
      rank: rank ?? 0,
      metadata: body.metadata ?? null,
      created_at: sql`now()`,
      updated_at: sql`now()`,
    }).returning()
    return c.json({ image: created }, 201)
  })
  .post("/:productId/images/assign", async (c) => {
    const db = getDb()
    const body = await c.req.json()
    const { image_id, variant_ids } = body

    if (variant_ids?.length) {
      const rows = variant_ids.map((vid: string) => ({
        id: generateId("pvpi"),
        variant_id: vid,
        image_id,
      }))
      await db.insert(productVariantProductImage).values(rows)
    }
    return c.json({ success: true })
  })
  .delete("/:productId/images/:imageId", async (c) => {
    const db = getDb()
    await db.update(productImage)
      .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
      .where(and(
        eq(productImage.id, c.req.param("imageId")),
        eq(productImage.product_id, c.req.param("productId"))
      ))
    return c.json({ deleted: true })
  })
