import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { listClaimsSchema, createClaimSchema } from "@my-store/validators"
import { claimService } from "../../services/claim.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

const claimItemsSchema = zValidator("json", z.object({
  items: z.array(z.object({ item_id: z.string(), quantity: z.number().min(1), reason: z.string().optional(), note: z.string().optional() })),
}))

const actionSchema = zValidator("json", z.object({ shipping_option_id: z.string().optional() }).passthrough())

export const adminClaims = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", zValidator("query", listClaimsSchema), async (c) => {
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
  // ── Inbound Items ─────────────────────────────────────
  .post("/:id/inbound/items", claimItemsSchema, async (c) => {
    const result = await claimService.addInboundItems(c.req.param("id"), c.req.valid("json"))
    return c.json(result)
  })
  .post("/:id/inbound/items/:actionId", claimItemsSchema, async (c) => {
    const result = await claimService.updateInboundItem(c.req.param("id"), c.req.param("actionId"), c.req.valid("json"))
    return c.json(result)
  })
  .delete("/:id/inbound/items/:actionId", async (c) => {
    const result = await claimService.removeInboundItem(c.req.param("id"), c.req.param("actionId"))
    return c.json(result)
  })
  // ── Inbound Shipping ──────────────────────────────────
  .post("/:id/inbound/shipping-method", actionSchema, async (c) => {
    const result = await claimService.addInboundShipping(c.req.param("id"), c.req.valid("json"))
    return c.json(result)
  })
  .post("/:id/inbound/shipping-method/:actionId", actionSchema, async (c) => {
    const result = await claimService.updateInboundShipping(c.req.param("id"), c.req.param("actionId"), c.req.valid("json"))
    return c.json(result)
  })
  .delete("/:id/inbound/shipping-method/:actionId", async (c) => {
    const result = await claimService.removeInboundShipping(c.req.param("id"), c.req.param("actionId"))
    return c.json(result)
  })
  // ── Outbound Shipping ─────────────────────────────────
  .post("/:id/outbound/shipping-method", actionSchema, async (c) => {
    const result = await claimService.addOutboundShipping(c.req.param("id"), c.req.valid("json"))
    return c.json(result)
  })
  .post("/:id/outbound/shipping-method/:actionId", actionSchema, async (c) => {
    const result = await claimService.updateOutboundShipping(c.req.param("id"), c.req.param("actionId"), c.req.valid("json"))
    return c.json(result)
  })
  .delete("/:id/outbound/shipping-method/:actionId", async (c) => {
    const result = await claimService.removeOutboundShipping(c.req.param("id"), c.req.param("actionId"))
    return c.json(result)
  })
  // ── Actions ───────────────────────────────────────────
  .post("/:id/request", async (c) => {
    const result = await claimService.request(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/cancel", async (c) => {
    const result = await claimService.cancel(c.req.param("id"))
    return c.json(result)
  })
