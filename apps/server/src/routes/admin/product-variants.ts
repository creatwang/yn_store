import { Hono } from "hono"
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
    const result = await variantService.listVariants(productId, { limit, offset })
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
  .delete("/:productId/variants/:variantId", async (c) => {
    const result = await variantService.deleteVariant(c.req.param("productId"), c.req.param("variantId"))
    return c.json(result)
  })
