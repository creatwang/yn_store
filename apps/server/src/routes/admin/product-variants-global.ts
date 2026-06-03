import { Hono } from "hono"
import { variantService } from "../../services/variant.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

/** 对齐官方 GET /admin/product-variants */
export const adminProductVariantsGlobal = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => {
    const limit = Number(c.req.query("limit") || 50)
    const offset = Number(c.req.query("offset") || 0)
    const q = c.req.query("q")
    const product_id = c.req.query("product_id")
    const rawId = c.req.queries("id") ?? c.req.query("id")
    const inventory_quantity = c.req.query("inventory_quantity") === "true"

    const result = await variantService.listAll({
      limit,
      offset,
      q,
      product_id,
      id: rawId,
      inventory_quantity,
    })

    return c.json(result)
  })
