import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
  createCartSchema,
  updateCartSchema,
  createCartLineItemSchema,
  updateCartLineItemSchema,
} from "@my-store/validators"
import { cartService } from "../../services/cart.service"
import { cartCheckoutService } from "../../services/store-checkout.service"

export const storeCarts = new Hono()
  .post("/", zValidator("json", createCartSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await cartService.create(body)
    return c.json(result, 201)
  })
  .get("/:id", async (c) => {
    const result = await cartService.getById(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id", zValidator("json", updateCartSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await cartService.update(c.req.param("id"), body)
    return c.json(result)
  })
  .post("/:id/line-items", zValidator("json", createCartLineItemSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await cartService.addItem(c.req.param("id"), {
      variant_id: body.variant_id,
      product_id: body.product_id,
      title: "",
      quantity: body.quantity,
      metadata: body.metadata,
    })
    return c.json(result, 201)
  })
  .post("/:id/line-items/:line_id", zValidator("json", updateCartLineItemSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await cartService.updateItem(
      c.req.param("id"),
      c.req.param("line_id"),
      { quantity: body.quantity || 1 }
    )
    return c.json(result)
  })
  .delete("/:id/line-items/:line_id", async (c) => {
    const result = await cartService.removeItem(
      c.req.param("id"),
      c.req.param("line_id")
    )
    return c.json(result)
  })
  .post("/:id/shipping-methods", async (c) => {
    const body = await c.req.json()
    const optionId = body.option_id ?? body.shipping_option_id ?? body.option?.id
    if (!optionId) {
      return c.json({ message: "缺少 option_id" }, 400)
    }
    const result = await cartCheckoutService.addShippingMethod(c.req.param("id"), {
      option_id: optionId,
      data: body.data,
    })
    return c.json(result, 201)
  })
  .post("/:id/complete", async (c) => {
    const result = await cartService.completeCheckout(c.req.param("id"))
    return c.json(result)
  })
