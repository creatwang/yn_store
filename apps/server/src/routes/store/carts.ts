import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
  createCartSchema,
  updateCartSchema,
  createCartLineItemSchema,
  updateCartLineItemSchema,
} from "@my-store/validators"
import { cartService } from "../../services/cart.service"

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
    const result = await cartService.addLineItem(c.req.param("id"), body)
    return c.json(result, 201)
  })
  .post("/:id/line-items/:line_id", zValidator("json", updateCartLineItemSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await cartService.updateLineItem(c.req.param("id"), c.req.param("line_id"), body)
    return c.json(result)
  })
  .post("/:id/complete", async (c) => {
    const result = await cartService.complete(c.req.param("id"))
    return c.json(result)
  })
