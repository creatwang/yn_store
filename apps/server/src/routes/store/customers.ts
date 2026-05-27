import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
  createCustomerSchema,
} from "@my-store/validators"
import { customerService } from "../../services/customer.service"

export const storeCustomers = new Hono()
  .post("/", zValidator("json", createCustomerSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await customerService.create(body)
    return c.json(result, 201)
  })
