import { Hono } from "hono"
import { and, desc, eq, isNull } from "drizzle-orm"
import { zValidator } from "@hono/zod-validator"
import { getDb, fulfillment, fulfillmentItem, fulfillmentLabel, orderItem } from "@my-store/db"
import { createFulfillmentSchema, createShipmentSchema } from "@my-store/validators"
import { fulfillmentService } from "../../services/fulfillment.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"
import { HTTPException } from "hono/http-exception"

export const adminFulfillments = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => {
    const db = getDb()
    const limit = Number(c.req.query("limit") || 50)
    const offset = Number(c.req.query("offset") || 0)
    const rows = await db
      .select()
      .from(fulfillment)
      .where(isNull(fulfillment.deleted_at))
      .orderBy(desc(fulfillment.created_at))
      .limit(limit)
      .offset(offset)
    return c.json({ fulfillments: rows, count: rows.length, limit, offset })
  })
  .get("/:id", async (c) => {
    const db = getDb()
    const id = c.req.param("id")
    const [row] = await db
      .select()
      .from(fulfillment)
      .where(and(eq(fulfillment.id, id), isNull(fulfillment.deleted_at)))
      .limit(1)
    if (!row) throw new HTTPException(404, { message: "未找到" })
    const [items, labels] = await Promise.all([
      db.select().from(fulfillmentItem).where(eq(fulfillmentItem.fulfillment_id, id)),
      db.select().from(fulfillmentLabel).where(eq(fulfillmentLabel.fulfillment_id, id)),
    ])
    return c.json({ fulfillment: { ...row, items, labels } })
  })
  .post("/", zValidator("json", createFulfillmentSchema), async (c) => {
    const body = c.req.valid("json")
    const orderId = body.order_id
    if (!orderId) throw new HTTPException(400, { message: "order_id 必填" })
    const result = await fulfillmentService.create(orderId, body)
    return c.json(result, 201)
  })
  .post("/:id/shipment", zValidator("json", createShipmentSchema), async (c) => {
    const body = c.req.valid("json")
    const fulfillmentId = c.req.param("id")
    const db = getDb()
    const [f] = await db
      .select()
      .from(fulfillment)
      .where(and(eq(fulfillment.id, fulfillmentId), isNull(fulfillment.canceled_at)))
      .limit(1)
    if (!f) throw new HTTPException(404, { message: "未找到" })

    const orderId = body.order_id ?? (body as { orderId?: string }).orderId
    if (!orderId) {
      const [fi] = await db
        .select()
        .from(fulfillmentItem)
        .where(eq(fulfillmentItem.fulfillment_id, fulfillmentId))
        .limit(1)
      if (!fi?.line_item_id) throw new HTTPException(400, { message: "order_id 必填" })
      const [oi] = await db.select().from(orderItem).where(eq(orderItem.item_id, fi.line_item_id)).limit(1)
      if (!oi) throw new HTTPException(400, { message: "无法解析 order_id" })
      const result = await fulfillmentService.createShipment(oi.order_id, fulfillmentId, body)
      return c.json(result)
    }
    const result = await fulfillmentService.createShipment(orderId, fulfillmentId, body)
    return c.json(result)
  })
  .post("/:id/cancel", async (c) => {
    const db = getDb()
    const id = c.req.param("id")
    const [updated] = await db
      .update(fulfillment)
      .set({ canceled_at: new Date(), updated_at: new Date() })
      .where(and(eq(fulfillment.id, id), isNull(fulfillment.deleted_at)))
      .returning()
    if (!updated) throw new HTTPException(404, { message: "未找到" })
    return c.json({ fulfillment: updated })
  })
