import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import {
  listReturnsSchema,
  createReturnSchema,
  receiveReturnSchema,
} from "@my-store/validators"
import { returnService } from "../../services/return.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

const returnItemsSchema = zValidator(
  "json",
  z.object({
    items: z.array(
      z.object({
        item_id: z.string(),
        quantity: z.number().min(1),
        note: z.string().optional().nullable(),
        reason_id: z.string().optional().nullable(),
      }),
    ),
  }),
)

const returnItemUpdateSchema = zValidator(
  "json",
  z.object({
    quantity: z.number().min(1).optional(),
    note: z.string().optional().nullable(),
  }).passthrough(),
)

const returnUpdateSchema = zValidator("json", z.record(z.unknown()))

const shippingSchema = zValidator("json", z.record(z.unknown()))

export const adminReturns = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", zValidator("query", listReturnsSchema), async (c) => {
    const query = c.req.valid("query")
    const result = await returnService.list(query)
    return c.json(result)
  })
  .post("/", zValidator("json", createReturnSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await returnService.create(body)
    return c.json(result, 201)
  })
  .get("/:id", async (c) => {
    const result = await returnService.getById(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id", returnUpdateSchema, async (c) => {
    const result = await returnService.updateRequest(c.req.param("id"), c.req.valid("json"))
    return c.json(result)
  })
  .post("/:id/cancel", async (c) => {
    const result = await returnService.cancel(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/request", returnUpdateSchema, async (c) => {
    const result = await returnService.confirmRequest(c.req.param("id"), c.req.valid("json"))
    return c.json(result)
  })
  .post("/:id/request/cancel", async (c) => {
    const result = await returnService.cancelRequest(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/request-items", returnItemsSchema, async (c) => {
    const body = c.req.valid("json")
    const ret = await returnService.getById(c.req.param("id"))
    const result = await returnService.addReturnItems(
      c.req.param("id"),
      ret.return.order_id,
      body.items,
    )
    return c.json(result)
  })
  .post("/:id/request-items/:actionId", returnItemUpdateSchema, async (c) => {
    const result = await returnService.updateReturnItem(
      c.req.param("id"),
      c.req.param("actionId"),
      c.req.valid("json"),
    )
    return c.json(result)
  })
  .delete("/:id/request-items/:actionId", async (c) => {
    const result = await returnService.removeReturnItem(
      c.req.param("id"),
      c.req.param("actionId"),
    )
    return c.json(result)
  })
  .post("/:id/shipping-method", shippingSchema, async (c) => {
    const result = await returnService.addReturnShipping(c.req.param("id"), c.req.valid("json"))
    return c.json(result)
  })
  .post("/:id/shipping-method/:actionId", shippingSchema, async (c) => {
    const result = await returnService.updateReturnShipping(
      c.req.param("id"),
      c.req.param("actionId"),
      c.req.valid("json"),
    )
    return c.json(result)
  })
  .delete("/:id/shipping-method/:actionId", async (c) => {
    const result = await returnService.deleteReturnShipping(
      c.req.param("id"),
      c.req.param("actionId"),
    )
    return c.json(result)
  })
  .post("/:id/dismiss-items", zValidator("json", receiveReturnSchema), async (c) => {
    const result = await returnService.dismissItems(c.req.param("id"), c.req.valid("json"))
    return c.json(result)
  })
  .post("/:id/dismiss-items/:actionId", returnItemUpdateSchema, async (c) => {
    const result = await returnService.updateReturnItem(
      c.req.param("id"),
      c.req.param("actionId"),
      c.req.valid("json"),
    )
    return c.json(result)
  })
  .delete("/:id/dismiss-items/:actionId", async (c) => {
    const result = await returnService.removeReturnItem(
      c.req.param("id"),
      c.req.param("actionId"),
    )
    return c.json(result)
  })
  .post("/:id/receive-items", zValidator("json", receiveReturnSchema), async (c) => {
    const result = await returnService.receiveItems(c.req.param("id"), c.req.valid("json"))
    return c.json(result)
  })
  .post("/:id/receive-items/:actionId", returnItemUpdateSchema, async (c) => {
    const result = await returnService.updateReturnItem(
      c.req.param("id"),
      c.req.param("actionId"),
      c.req.valid("json"),
    )
    return c.json(result)
  })
  .delete("/:id/receive-items/:actionId", async (c) => {
    const result = await returnService.removeReturnItem(
      c.req.param("id"),
      c.req.param("actionId"),
    )
    return c.json(result)
  })
  .post("/:id/receive", async (c) => {
    const result = await returnService.initiateReceive(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/receive/confirm", zValidator("json", receiveReturnSchema), async (c) => {
    const result = await returnService.confirmReceive(c.req.param("id"), c.req.valid("json"))
    return c.json(result)
  })
  .post("/:id/receive/cancel", async (c) => {
    const result = await returnService.cancelReceive(c.req.param("id"))
    return c.json(result)
  })
