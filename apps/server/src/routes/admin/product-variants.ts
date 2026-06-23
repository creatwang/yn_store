import { Hono } from "hono"
import { eq } from "drizzle-orm"
import { generateId, getDb, productVariantInventoryItem } from "@my-store/db"
import { variantService } from "../../services/variant.service"
import { imageService } from "../../services/image.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminProductVariants = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/:productId/variants", async (c) => {
    const productId = c.req.param("productId")
    const limit = Number(c.req.query("limit") || 50)
    const offset = Number(c.req.query("offset") || 0)
    const withInventory = c.req.query("inventory_quantity") === "true"
    const fields = c.req.query("fields")
    const id = c.req.query("id")
    const result = await variantService.listVariants(productId, {
      limit,
      offset,
      id,
    })
    if (fields?.includes("inventory_items")) {
      result.variants = await variantService.withInventoryItems(result.variants)
    }
    if (withInventory) {
      result.variants = await variantService.withInventoryQuantity(result.variants)
    }
    return c.json(result)
  })
  .get("/:productId/variants/:variantId", async (c) => {
    const result = await variantService.getVariant(c.req.param("productId"), c.req.param("variantId"))
    const withInventory = c.req.query("inventory_quantity") === "true"
    if (withInventory) {
      const enriched = await variantService.withInventoryQuantity([result.variant])
      result.variant = enriched[0]
    }
    return c.json(result)
  })
  .post("/:productId/variants/batch", async (c) => {
    const body = await c.req.json()
    const result = await variantService.batchVariants(c.req.param("productId"), body)
    return c.json(result)
  })
  .post("/:productId/variants", async (c) => {
    const body = await c.req.json()
    const result = await variantService.createVariant(c.req.param("productId"), body)
    return c.json(result, 201)
  })
  .post("/:productId/variants/:variantId", async (c) => {
    const body = await c.req.json()
    const result = await variantService.updateVariant(c.req.param("productId"), c.req.param("variantId"), body)
    return c.json(result)
  })
  .post("/:productId/variants/:variantId/images/batch", async (c) => {
    const body = await c.req.json()
    const result = await imageService.batchVariantImages(c.req.param("variantId"), body)
    return c.json(result)
  })
  .post("/:productId/variants/:variantId/inventory-items/batch", async (c) => {
    const db = getDb()
    const variantId = c.req.param("variantId")
    const body = await c.req.json()
    // 鍏ㄩ噺鏇挎崲
    await db.delete(productVariantInventoryItem).where(eq(productVariantInventoryItem.variant_id, variantId))
    for (const item of body.items || []) {
      await db.insert(productVariantInventoryItem).values({
        id: generateId("pvii"),
        variant_id: variantId,
        inventory_item_id: item.inventory_item_id,
        required_quantity: item.required_quantity ?? 1,
      })
    }
    return c.json({ success: true }, 200)
  })
  .delete("/:productId/variants/:variantId", async (c) => {
    const result = await variantService.deleteVariant(c.req.param("productId"), c.req.param("variantId"))
    return c.json(result)
  })
