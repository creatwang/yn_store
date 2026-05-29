import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { listReturnsSchema, createReturnSchema, receiveReturnSchema } from "@my-store/validators"
import { returnService } from "../../services/return.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

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
  .post("/:id/cancel", async (c) => {
    const result = await returnService.cancel(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/receive/confirm", zValidator("json", receiveReturnSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await returnService.receive(c.req.param("id"), body)
    return c.json(result)
  })
