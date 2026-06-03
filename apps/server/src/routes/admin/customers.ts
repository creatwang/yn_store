import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { rpcQueryValidator } from "../../lib/rpc-query-validator"
import {
  createCustomerSchema,
  updateCustomerSchema,
  createCustomerAddressSchema,
  updateCustomerAddressSchema,
} from "@my-store/validators"
import { AdminCustomersParams } from "@my-store/validators/admin-list-params"
import { customerService } from "../../services/customer.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"
import { sql, eq, and } from "drizzle-orm"
import { customerGroupCustomer, generateId, getDb } from "@my-store/db"

export const adminCustomers = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", rpcQueryValidator(AdminCustomersParams), async (c) => {
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
  // 鈹€鈹€ 鍦板潃绠＄悊 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
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
  .post("/:id/customer-groups", async (c) => {
    const db = getDb()
    const customerId = c.req.param("id")
    const body = await c.req.json()
    const add: string[] = body.add ?? body.customer_group_ids ?? body.customerGroupIds ?? []
    const remove: string[] = body.remove ?? []

    for (const gid of add) {
      await db.execute(sql`
        INSERT INTO customer_group_customer (id, customer_id, customer_group_id)
        VALUES (${generateId("cgc")}, ${customerId}, ${gid})
        ON CONFLICT DO NOTHING
      `)
    }

    if (remove.length) {
      for (const gid of remove) {
        await db
          .delete(customerGroupCustomer)
          .where(
            and(
              eq(customerGroupCustomer.customer_id, customerId),
              eq(customerGroupCustomer.customer_group_id, gid),
            ),
          )
      }
    }

    return c.json({ customer: { id: customerId }, added: add, removed: remove })
  })

