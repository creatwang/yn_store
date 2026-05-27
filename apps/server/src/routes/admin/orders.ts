import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
  createOrderSchema,
  listOrdersSchema,
  updateOrderSchema,
} from "@my-store/validators"
import { orderService } from "../../services/order.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminOrders = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", zValidator("query", listOrdersSchema), async (c) => {
    const query = c.req.valid("query")
    const result = await orderService.list(query)
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await orderService.getById(c.req.param("id"))
    return c.json(result)
  })
  .post("/", zValidator("json", createOrderSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await orderService.create(body)
    return c.json(result, 201)
  })
  .post("/:id", zValidator("json", updateOrderSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await orderService.update(c.req.param("id"), body)
    return c.json(result)
  })
  .post("/:id/cancel", async (c) => {
    const result = await orderService.cancel(c.req.param("id"))
    return c.json(result)
  })
