import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import {
  AdminPostOrderEditsAddItemsReqSchema,
  AdminPostOrderEditsItemsActionReqSchema,
  AdminPostOrderEditsShippingActionReqSchema,
  AdminPostOrderEditsShippingReqSchema,
} from "@my-store/validators/medusa/admin/order-edits/validators"
import { orderEditService } from "../../services/order-edit.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

const addItemsSchema = zValidator("json", AdminPostOrderEditsAddItemsReqSchema)

const updateItemSchema = zValidator("json", AdminPostOrderEditsItemsActionReqSchema)

const updateChangeSchema = zValidator(
  "json",
  z.looseObject({ carry_over_promotions: z.boolean().optional() }),
)

const requestEditSchema = zValidator(
  "json",
  z
    .object({
      internal_note: z.string().optional(),
      send_notification: z.boolean().optional(),
    })
    .default({}),
)

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
  .post("/:id/request", requestEditSchema, async (c) => {
    const body = c.req.valid("json") ?? {}
    const result = await orderEditService.request(c.req.param("id"), body)
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
    const { items } = c.req.valid("json")
    const result = await orderEditService.addItems(
      c.req.param("id"),
      items.map((item) => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: item.unit_price ?? undefined,
      })),
    )
    return c.json(result)
  })
  .post("/:id/items/:itemId", updateItemSchema, async (c) => {
    const body = c.req.valid("json")
    const result = await orderEditService.updateOriginalItem(
      c.req.param("id"),
      c.req.param("itemId"),
      {
        quantity: body.quantity,
        unit_price: body.unit_price ?? undefined,
      },
    )
    return c.json(result)
  })
  .post("/:id/items/:itemId/update", updateItemSchema, async (c) => {
    const body = c.req.valid("json")
    const result = await orderEditService.updateAddedItem(
      c.req.param("id"),
      c.req.param("itemId"),
      { quantity: body.quantity },
    )
    return c.json(result)
  })
  .delete("/:id/items/:itemId", async (c) => {
    const result = await orderEditService.removeAddedItem(c.req.param("id"), c.req.param("itemId"))
    return c.json(result)
  })
  .post("/:id/shipping-method", zValidator("json", AdminPostOrderEditsShippingReqSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await orderEditService.addShippingMethod(c.req.param("id"), {
      shipping_option_id: body.shipping_option_id,
      amount: body.custom_amount,
      name: body.description,
    })
    return c.json(result)
  })
  .post(
    "/:id/shipping-method/:actionId",
    zValidator("json", AdminPostOrderEditsShippingActionReqSchema),
    async (c) => {
      const body = c.req.valid("json")
      const result = await orderEditService.updateShippingMethod(
        c.req.param("id"),
        c.req.param("actionId"),
        {
          amount: body.custom_amount ?? undefined,
          internal_note: body.internal_note ?? undefined,
          metadata: body.metadata,
        },
      )
      return c.json(result)
    },
  )
  .delete("/:id/shipping-method/:actionId", async (c) => {
    const result = await orderEditService.removeShippingMethod(c.req.param("id"), c.req.param("actionId"))
    return c.json(result)
  })
  .post("/:id/changes", updateChangeSchema, async (c) => {
    const body = c.req.valid("json")
    const db = (await import("../../services/order.service")).orderService
    const result = await db.updateOrderChange(c.req.param("id"), body)
    return c.json(result)
  })
  .delete("/:id", async (c) => {
    const result = await orderEditService.cancel(c.req.param("id"))
    return c.json(result)
  })
