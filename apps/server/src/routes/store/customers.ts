import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
  createCustomerSchema,
  registerCustomerSchema,
  createCustomerAddressSchema,
  updateCustomerAddressSchema,
} from "@my-store/validators"
import { customerService } from "../../services/customer.service"
import { storeAuth } from "../../middleware/auth"

export const storeCustomers = new Hono()
  .post("/", zValidator("json", createCustomerSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await customerService.create(body)
    return c.json(result, 201)
  })
  .post("/register", zValidator("json", registerCustomerSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await customerService.register({ ...body, has_account: true })
    return c.json(result, 201)
  })
  .get("/me", storeAuth, async (c) => {
    const user = c.get("user")
    const result = await customerService.getById(user.actor_id)
    return c.json(result)
  })
  .patch("/me", storeAuth, zValidator("json", createCustomerSchema.partial()), async (c) => {
    const user = c.get("user")
    const body = c.req.valid("json")
    const result = await customerService.update(user.actor_id, body)
    return c.json(result)
  })
  // ── Addresses ──
  .get("/me/addresses", storeAuth, async (c) => {
    const user = c.get("user")
    const result = await customerService.listAddresses(user.actor_id)
    return c.json(result)
  })
  .post("/me/addresses", storeAuth, zValidator("json", createCustomerAddressSchema), async (c) => {
    const user = c.get("user")
    const body = c.req.valid("json")
    const result = await customerService.createAddress(user.actor_id, body)
    return c.json(result, 201)
  })
  .get("/me/addresses/:addressId", storeAuth, async (c) => {
    const user = c.get("user")
    const result = await customerService.getAddress(user.actor_id, c.req.param("addressId"))
    return c.json(result)
  })
  .patch("/me/addresses/:addressId", storeAuth, zValidator("json", updateCustomerAddressSchema), async (c) => {
    const user = c.get("user")
    const body = c.req.valid("json")
    const result = await customerService.updateAddress(user.actor_id, c.req.param("addressId"), body)
    return c.json(result)
  })
  .delete("/me/addresses/:addressId", storeAuth, async (c) => {
    const user = c.get("user")
    const result = await customerService.deleteAddress(user.actor_id, c.req.param("addressId"))
    return c.json(result)
  })
