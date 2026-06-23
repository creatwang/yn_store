import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { rpcQueryValidator } from "../../lib/infra/query/rpc-query-validator"
import { z } from "zod"
import { createClaimSchema } from "@my-store/validators"
import { AdminListClaimsParams } from "@my-store/validators/admin-list-params"
import { claimService } from "../../services/claim.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

const claimItemsSchema = zValidator("json", z.object({
  items: z.array(z.object({ item_id: z.string(), quantity: z.number().min(1), reason: z.string().optional(), note: z.string().optional() })),
}))

const outboundItemsSchema = zValidator("json", z.object({
  items: z.array(z.object({
    variant_id: z.string(),
    quantity: z.number().min(1),
  })),
}))

const actionSchema = zValidator("json", z.object({ shipping_option_id: z.string().optional() }).passthrough())

export const adminClaims = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", rpcQueryValidator(AdminListClaimsParams), async (c) => {
    const result = await claimService.list(c.req.valid("query"))
    return c.json(result)
  })
  .post("/", zValidator("json", createClaimSchema), async (c) => {
    const result = await claimService.create(c.req.valid("json"))
    return c.json(result, 201)
  })
  .get("/:id", async (c) => {
    const result = await claimService.getById(c.req.param("id"))
    return c.json(result)
  })
  // 鈹€鈹€ Inbound Items 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  .post("/:id/inbound/items", claimItemsSchema, async (c) => {
    const result = await claimService.addInboundItems(c.req.param("id"), c.req.valid("json"))
    return c.json(result)
  })
  .post("/:id/inbound/items/:actionId", claimItemsSchema, async (c) => {
    const body = c.req.valid("json")
    const result = await claimService.updateInboundItem(c.req.param("id"), c.req.param("actionId"), body.items[0] ?? body)
    return c.json(result)
  })
  .delete("/:id/inbound/items/:actionId", async (c) => {
    const result = await claimService.removeInboundItem(c.req.param("id"), c.req.param("actionId"))
    return c.json(result)
  })
  // 鈹€鈹€ Inbound Shipping 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  .post("/:id/inbound/shipping-method", actionSchema, async (c) => {
    const result = await claimService.addInboundShipping(c.req.param("id"), c.req.valid("json") as any)
    return c.json(result)
  })
  .post("/:id/inbound/shipping-method/:actionId", actionSchema, async (c) => {
    const result = await claimService.updateInboundShipping(c.req.param("id"), c.req.param("actionId"), c.req.valid("json") as any)
    return c.json(result)
  })
  .delete("/:id/inbound/shipping-method/:actionId", async (c) => {
    const result = await claimService.removeInboundShipping(c.req.param("id"), c.req.param("actionId"))
    return c.json(result)
  })
  // 鈹€鈹€ Outbound Shipping 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  .post("/:id/outbound/shipping-method", actionSchema, async (c) => {
    const result = await claimService.addOutboundShipping(c.req.param("id"), c.req.valid("json") as any)
    return c.json(result)
  })
  .post("/:id/outbound/shipping-method/:actionId", actionSchema, async (c) => {
    const result = await claimService.updateOutboundShipping(c.req.param("id"), c.req.param("actionId"), c.req.valid("json") as any)
    return c.json(result)
  })
  .delete("/:id/outbound/shipping-method/:actionId", async (c) => {
    const result = await claimService.removeOutboundShipping(c.req.param("id"), c.req.param("actionId"))
    return c.json(result)
  })
  // 鈹€鈹€ Outbound Items 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  .post("/:id/outbound/items", outboundItemsSchema, async (c) => {
    const body = c.req.valid("json")
    const result = await claimService.addOutboundItems(c.req.param("id"), body)
    return c.json(result)
  })
  .post("/:id/outbound/items/:actionId", outboundItemsSchema, async (c) => {
    const body = c.req.valid("json")
    const item = body.items[0]
    const result = await claimService.updateOutboundItem(c.req.param("id"), c.req.param("actionId"), {
      quantity: item?.quantity,
    })
    return c.json(result)
  })
  .delete("/:id/outbound/items/:actionId", async (c) => {
    const result = await claimService.removeOutboundItem(c.req.param("id"), c.req.param("actionId"))
    return c.json(result)
  })
  // 鈹€鈹€ Actions 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  .post(
    "/:id/request",
    zValidator(
      "json",
      z.object({ no_notification: z.boolean().optional() }).default({}),
    ),
    async (c) => {
      const body = c.req.valid("json")
      const result = await claimService.request(c.req.param("id"), body)
      return c.json(result)
    },
  )
  .post("/:id/request/cancel", async (c) => {
    const result = await claimService.cancelRequest(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/cancel", async (c) => {
    const result = await claimService.cancel(c.req.param("id"))
    return c.json(result)
  })

