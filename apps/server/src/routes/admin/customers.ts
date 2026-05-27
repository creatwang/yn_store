import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
  createCustomerSchema,
  listCustomersSchema,
  updateCustomerSchema,
} from "@my-store/validators"
import { customerService } from "../../services/customer.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminCustomers = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", zValidator("query", listCustomersSchema), async (c) => {
    const query = c.req.valid("query")
    const result = await customerService.list(query)
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await customerService.getById(c.req.param("id"))
    return c.json(result)
  })
  .post("/", zValidator("json", createCustomerSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await customerService.create(body)
    return c.json(result, 201)
  })
  .post("/:id", zValidator("json", updateCustomerSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await customerService.update(c.req.param("id"), body)
    return c.json(result)
  })
