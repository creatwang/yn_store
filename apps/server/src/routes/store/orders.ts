import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { listOrdersSchema } from "@my-store/validators"
import { orderService } from "../../services/order.service"

export const storeOrders = new Hono()
  .get("/", zValidator("query", listOrdersSchema), async (c) => {
    const query = c.req.valid("query")
    const result = await orderService.list(query)
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await orderService.getById(c.req.param("id"))
    return c.json(result)
  })
