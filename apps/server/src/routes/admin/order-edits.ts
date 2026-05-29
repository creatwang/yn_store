import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { orderEditService } from "../../services/order-edit.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

const addItemsSchema = zValidator("json", z.object({
  items: z.array(z.object({ variant_id: z.string(), quantity: z.number().min(1), unit_price: z.number().optional() })),
}))

const updateItemSchema = zValidator("json", z.object({ quantity: z.number().optional(), unit_price: z.number().optional() }))

const updateChangeSchema = zValidator("json", z.object({ carry_over_promotions: z.boolean().optional() }).passthrough())

export const adminOrderEdits = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .post("/", zValidator("json", z.object({ order_id: z.string() })), async (c) => {
    const { order_id } = c.req.valid("json")
    const result = await orderEditService.create(order_id)
    return c.json(result, 201)
  })
  .get("/:id", async (c) => {
    const result = await orderEditService.getById(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/request", async (c) => {
    const result = await orderEditService.request(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/confirm", async (c) => {
    const result = await orderEditService.confirm(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/cancel", async (c) => {
    const result = await orderEditService.cancel(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/items", addItemsSchema, async (c) => {
    const result = await orderEditService.addItems(c.req.param("id"), c.req.valid("json").items)
    return c.json(result)
  })
  .post("/:id/items/:itemId", updateItemSchema, async (c) => {
    const result = await orderEditService.updateOriginalItem(c.req.param("id"), c.req.param("itemId"), c.req.valid("json"))
    return c.json(result)
  })
  .post("/:id/items/:itemId/update", updateItemSchema, async (c) => {
    const result = await orderEditService.updateAddedItem(c.req.param("id"), c.req.param("itemId"), c.req.valid("json"))
    return c.json(result)
  })
  .delete("/:id/items/:itemId", async (c) => {
    const result = await orderEditService.removeAddedItem(c.req.param("id"), c.req.param("itemId"))
    return c.json(result)
  })
  .post("/:id/changes", updateChangeSchema, async (c) => {
    const body = c.req.valid("json")
    const db = (await import("../../services/order.service")).orderService
    const result = await db.updateOrderChange(c.req.param("id"), body)
    return c.json(result)
  })
