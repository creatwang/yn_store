import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { createOrderSchema } from "@my-store/validators"
import { draftOrderService } from "../../services/draft-order.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

const listQuerySchema = z.object({
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
  q: z.string().optional(),
  status: z.string().optional(),
})

const createSchema = createOrderSchema

const updateSchema = createSchema.partial()

const addItemsSchema = z.object({
  items: z.array(z.object({
    variant_id: z.string().optional(),
    quantity: z.number().min(1),
    unit_price: z.number().optional(),
    title: z.string().optional(),
  })),
})

const updateItemSchema = z.object({
  quantity: z.number().min(1).optional(),
  unit_price: z.number().optional(),
})

const shippingMethodSchema = z.object({
  shipping_option_id: z.string(),
  amount: z.number().optional(),
})

const promotionSchema = z.object({
  code: z.string(),
})

export const adminDraftOrders = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  // ── CRUD ──────────────────────────────────────────────
  .get("/", zValidator("query", listQuerySchema), async (c) => {
    const result = await draftOrderService.list(c.req.valid("query"))
    return c.json(result)
  })
  .post("/", zValidator("json", createSchema), async (c) => {
    const result = await draftOrderService.create(c.req.valid("json"))
    return c.json(result, 201)
  })
  .get("/:id", async (c) => {
    const result = await draftOrderService.getById(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id", zValidator("json", updateSchema), async (c) => {
    const result = await draftOrderService.update(c.req.param("id"), c.req.valid("json"))
    return c.json(result)
  })
  .delete("/:id", async (c) => {
    const result = await draftOrderService.delete(c.req.param("id"))
    return c.json(result)
  })
  // ── Convert to Order ──────────────────────────────────
  .post("/:id/convert-to-order", async (c) => {
    const result = await draftOrderService.convertToOrder(c.req.param("id"))
    return c.json(result)
  })
  // ── Edit Workflow ─────────────────────────────────────
  .post("/:id/edit", async (c) => {
    const result = await draftOrderService.beginEdit(c.req.param("id"))
    return c.json(result)
  })
  .delete("/:id/edit", async (c) => {
    const result = await draftOrderService.cancelEdit(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/edit/items", zValidator("json", addItemsSchema), async (c) => {
    const result = await draftOrderService.addItems(c.req.param("id"), c.req.valid("json").items)
    return c.json(result)
  })
  .post("/:id/edit/items/:actionId", zValidator("json", updateItemSchema), async (c) => {
    const result = await draftOrderService.updateItemAction(c.req.param("id"), c.req.param("actionId"), c.req.valid("json"))
    return c.json(result)
  })
  .delete("/:id/edit/items/:actionId", async (c) => {
    const result = await draftOrderService.removeItemAction(c.req.param("id"), c.req.param("actionId"))
    return c.json(result)
  })
  .post("/:id/edit/shipping-methods", zValidator("json", shippingMethodSchema), async (c) => {
    const result = await draftOrderService.addShippingMethod(c.req.param("id"), c.req.valid("json"))
    return c.json(result)
  })
  .post("/:id/edit/shipping-methods/:actionId", zValidator("json", shippingMethodSchema.partial()), async (c) => {
    const result = await draftOrderService.updateShippingMethodAction(c.req.param("id"), c.req.param("actionId"), c.req.valid("json"))
    return c.json(result)
  })
  .delete("/:id/edit/shipping-methods/:actionId", async (c) => {
    const result = await draftOrderService.removeShippingMethodAction(c.req.param("id"), c.req.param("actionId"))
    return c.json(result)
  })
  .post("/:id/edit/promotions", zValidator("json", promotionSchema), async (c) => {
    const result = await draftOrderService.addPromotions(c.req.param("id"), c.req.valid("json"))
    return c.json(result)
  })
  .delete("/:id/edit/promotions/:actionId", async (c) => {
    const result = await draftOrderService.removePromotionAction(c.req.param("id"), c.req.param("actionId"))
    return c.json(result)
  })
  .post("/:id/edit/request", async (c) => {
    const result = await draftOrderService.requestEdit(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/edit/confirm", async (c) => {
    const result = await draftOrderService.confirmEdit(c.req.param("id"))
    return c.json(result)
  })
