import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
  createCustomerSchema,
  listCustomersSchema,
  updateCustomerSchema,
  createCustomerAddressSchema,
  updateCustomerAddressSchema,
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
  .delete("/:id", async (c) => {
    const result = await customerService.delete(c.req.param("id"))
    return c.json(result)
  })
  // ── 地址管理 ──────────────────────────────────────────────
  .get("/:id/addresses", async (c) => {
    const result = await customerService.listAddresses(c.req.param("id"))
    return c.json(result)
  })
  .get("/:id/addresses/:addressId", async (c) => {
    const result = await customerService.getAddress(c.req.param("id"), c.req.param("addressId"))
    return c.json(result)
  })
  .post("/:id/addresses", zValidator("json", createCustomerAddressSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await customerService.createAddress(c.req.param("id"), body)
    return c.json(result, 201)
  })
  .post("/:id/addresses/:addressId", zValidator("json", updateCustomerAddressSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await customerService.updateAddress(c.req.param("id"), c.req.param("addressId"), body)
    return c.json(result)
  })
  .delete("/:id/addresses/:addressId", async (c) => {
    const result = await customerService.deleteAddress(c.req.param("id"), c.req.param("addressId"))
    return c.json(result)
  })
