import { Hono } from "hono"
import { rpcQueryValidator } from "../../lib/rpc-query-validator"
import { sql, eq, inArray } from "drizzle-orm"
import { generateId, getDb, shippingOptionRule } from "@my-store/db"
import { AdminGetShippingOptionsParams } from "@my-store/validators/admin-list-params"
import { adminAuth, type AuthVariables } from "../../middleware/auth"
import { shippingOptionService } from "../../services/stock-location.service"

export const adminShippingOptions = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  // 鈹€鈹€ CRUD 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  .get("/", rpcQueryValidator(AdminGetShippingOptionsParams), async (c) => {
    const result = await shippingOptionService.list(c.req.valid("query"))
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await shippingOptionService.getById(c.req.param("id"))
    return c.json(result)
  })
  .post("/", async (c) => {
    const body = await c.req.json()
    const result = await shippingOptionService.create(body)
    return c.json(result, 201)
  })
  .post("/:id", async (c) => {
    const body = await c.req.json()
    const result = await shippingOptionService.update(c.req.param("id"), body)
    return c.json(result)
  })
  .delete("/:id", async (c) => {
    const result = await shippingOptionService.delete(c.req.param("id"))
    return c.json(result)
  })
  // 鈹€鈹€ Rules Batch (瀵归綈 Medusa: POST /admin/shipping-options/:id/rules/batch) 鈹€鈹€
  .post("/:id/rules/batch", async (c) => {
    const db = getDb()
    const shippingOptionId = c.req.param("id")
    const body = await c.req.json<{
      create?: Array<{ operator: string; attribute: string; value: string | string[] }>
      update?: Array<{ id: string; operator: string; attribute: string; value: string | string[] }>
      delete?: string[]
    }>()

    const created: any[] = []
    const updated: any[] = []

    // Validate shipping option exists
    const [existing] = await db.execute(sql`
      SELECT 1 FROM shipping_option WHERE id = ${shippingOptionId} AND deleted_at IS NULL LIMIT 1
    `)
    const rows = (existing as any).rows ?? []
    if (rows.length === 0) {
      return c.json({ message: "Shipping option not found" }, 404)
    }

    // Create
    if (body.create?.length) {
      for (const rule of body.create) {
        const id = generateId("sorul")
        const value = typeof rule.value === "string" ? rule.value : JSON.stringify(rule.value)
        await db.insert(shippingOptionRule).values({
          id,
          attribute: rule.attribute,
          operator: rule.operator,
          value,
          shipping_option_id: shippingOptionId,
        })
        const [r] = await db.select().from(shippingOptionRule).where(eq(shippingOptionRule.id, id))
        if (r) created.push(r)
      }
    }

    // Update
    if (body.update?.length) {
      for (const rule of body.update) {
        const value = typeof rule.value === "string" ? rule.value : JSON.stringify(rule.value)
        await db.update(shippingOptionRule).set({
          attribute: rule.attribute,
          operator: rule.operator,
          value,
        }).where(eq(shippingOptionRule.id, rule.id))
        const [r] = await db.select().from(shippingOptionRule).where(eq(shippingOptionRule.id, rule.id))
        if (r) updated.push(r)
      }
    }

    // Delete
    if (body.delete?.length) {
      await db.delete(shippingOptionRule).where(inArray(shippingOptionRule.id, body.delete))
    }

    return c.json({
      created,
      updated,
      deleted: body.delete ?? [],
    })
  })

