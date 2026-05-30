import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { listExchangesSchema, createExchangeSchema } from "@my-store/validators"
import { exchangeService } from "../../services/exchange.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

const exchangeItemsSchema = zValidator("json", z.object({
  items: z.array(z.object({ item_id: z.string(), quantity: z.number().min(1) })),
}))

const outboundItemsSchema = zValidator("json", z.object({
  items: z.array(z.object({ variant_id: z.string(), quantity: z.number().min(1) })),
}))

const actionSchema = zValidator("json", z.object({ shipping_option_id: z.string().optional() }).passthrough())

export const adminExchanges = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", zValidator("query", listExchangesSchema), async (c) => {
    const result = await exchangeService.list(c.req.valid("query"))
    return c.json(result)
  })
  .post("/", zValidator("json", createExchangeSchema), async (c) => {
    const result = await exchangeService.create(c.req.valid("json"))
    return c.json(result, 201)
  })
  .get("/:id", async (c) => {
    const result = await exchangeService.getById(c.req.param("id"))
    return c.json(result)
  })
  // ── Inbound Items ─────────────────────────────────────
  .post("/:id/inbound/items", exchangeItemsSchema, async (c) => {
    const result = await exchangeService.addInboundItems(c.req.param("id"), c.req.valid("json"))
    return c.json(result)
  })
  .post("/:id/inbound/items/:actionId", exchangeItemsSchema, async (c) => {
    const body = c.req.valid("json")
    const result = await exchangeService.updateInboundItem(c.req.param("id"), c.req.param("actionId"), body.items[0] ?? body)
    return c.json(result)
  })
  .delete("/:id/inbound/items/:actionId", async (c) => {
    const result = await exchangeService.removeInboundItem(c.req.param("id"), c.req.param("actionId"))
    return c.json(result)
  })
  // ── Inbound Shipping ──────────────────────────────────
  .post("/:id/inbound/shipping-method", actionSchema, async (c) => {
    const result = await exchangeService.addInboundShipping(c.req.param("id"), c.req.valid("json") as any)
    return c.json(result)
  })
  .post("/:id/inbound/shipping-method/:actionId", actionSchema, async (c) => {
    const result = await exchangeService.updateInboundShipping(c.req.param("id"), c.req.param("actionId"), c.req.valid("json") as any)
    return c.json(result)
  })
  .delete("/:id/inbound/shipping-method/:actionId", async (c) => {
    const result = await exchangeService.removeInboundShipping(c.req.param("id"), c.req.param("actionId"))
    return c.json(result)
  })
  // ── Outbound Items ────────────────────────────────────
  .post("/:id/outbound/items", outboundItemsSchema, async (c) => {
    const result = await exchangeService.addOutboundItems(c.req.param("id"), c.req.valid("json"))
    return c.json(result)
  })
  .post("/:id/outbound/items/:actionId", outboundItemsSchema, async (c) => {
    const body = c.req.valid("json")
    const result = await exchangeService.updateOutboundItem(c.req.param("id"), c.req.param("actionId"), body.items[0] ?? body)
    return c.json(result)
  })
  .delete("/:id/outbound/items/:actionId", async (c) => {
    const result = await exchangeService.removeOutboundItem(c.req.param("id"), c.req.param("actionId"))
    return c.json(result)
  })
  // ── Outbound Shipping ─────────────────────────────────
  .post("/:id/outbound/shipping-method", actionSchema, async (c) => {
    const result = await exchangeService.addOutboundShipping(c.req.param("id"), c.req.valid("json") as any)
    return c.json(result)
  })
  .post("/:id/outbound/shipping-method/:actionId", actionSchema, async (c) => {
    const result = await exchangeService.updateOutboundShipping(c.req.param("id"), c.req.param("actionId"), c.req.valid("json") as any)
    return c.json(result)
  })
  .delete("/:id/outbound/shipping-method/:actionId", async (c) => {
    const result = await exchangeService.removeOutboundShipping(c.req.param("id"), c.req.param("actionId"))
    return c.json(result)
  })
  // ── Actions ───────────────────────────────────────────
  .post("/:id/request", async (c) => {
    const result = await exchangeService.request(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/request/cancel", async (c) => {
    const result = await exchangeService.cancelRequest(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/cancel", async (c) => {
    const result = await exchangeService.cancel(c.req.param("id"))
    return c.json(result)
  })
