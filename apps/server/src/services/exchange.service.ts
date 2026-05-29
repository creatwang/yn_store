import { and, count, desc, eq, isNull, sql } from "drizzle-orm"
import { generateId, getDb, orderExchange, orderChange } from "@my-store/db"
import type { CreateExchangeInput, ListExchangesQuery } from "@my-store/validators"
import { HTTPException } from "hono/http-exception"

export const exchangeService = {
  async list(query: ListExchangesQuery) {
    const db = getDb()
    const conditions = [isNull(orderExchange.deleted_at)]
    if (query.order_id) conditions.push(eq(orderExchange.order_id, query.order_id))
    const [exchanges, [{ total }]] = await Promise.all([
      db.select().from(orderExchange).where(and(...conditions)).orderBy(desc(orderExchange.created_at)).limit(query.limit).offset(query.offset),
      db.select({ total: count() }).from(orderExchange).where(and(...conditions)),
    ])
    return { exchanges, count: Number(total) }
  },

  async getById(id: string) {
    const db = getDb()
    const [item] = await db.select().from(orderExchange).where(and(eq(orderExchange.id, id), isNull(orderExchange.deleted_at))).limit(1)
    if (!item) throw new HTTPException(404, { message: "Exchange not found" })
    return { exchange: item }
  },

  async create(input: CreateExchangeInput) {
    const db = getDb()
    const id = generateId("exchange")
    const [created] = await db.insert(orderExchange).values({
      id, order_id: input.order_id, order_version: input.order_version ?? 1,
      difference_due: input.difference_due ? String(input.difference_due) : null,
      raw_difference_due: input.difference_due ? { amount: input.difference_due, precision: 2 } : null,
      allow_backorder: input.allow_backorder ?? false, created_by: "admin",
    }).returning()

    await db.insert(orderChange).values({
      id: generateId("ordch"), order_id: input.order_id, exchange_id: id,
      version: input.order_version ?? 1, change_type: "exchange", created_by: "admin",
    })
    return { exchange: created }
  },

  // ── Inbound Items ────────────────────────────────────
  async addInboundItems(exchangeId: string, payload: { items: { item_id: string; quantity: number }[] }) {
    const exchange = await this.getById(exchangeId)
    const meta = (exchange.exchange.metadata as Record<string, any>) ?? {}
    const items = (meta.inbound_items ?? []).concat(payload.items.map(i => ({ ...i, id: generateId("act") })))
    meta.inbound_items = items
    const db = getDb()
    await db.update(orderExchange).set({ metadata: meta }).where(eq(orderExchange.id, exchangeId))
    return this.getById(exchangeId)
  },

  async updateInboundItem(exchangeId: string, actionId: string, payload: { quantity?: number }) {
    const exchange = await this.getById(exchangeId)
    const meta = (exchange.exchange.metadata as Record<string, any>) ?? {}
    meta.inbound_items = (meta.inbound_items ?? []).map((i: any) => i.id === actionId ? { ...i, ...payload } : i)
    const db = getDb()
    await db.update(orderExchange).set({ metadata: meta }).where(eq(orderExchange.id, exchangeId))
    return this.getById(exchangeId)
  },

  async removeInboundItem(exchangeId: string, actionId: string) {
    const exchange = await this.getById(exchangeId)
    const meta = (exchange.exchange.metadata as Record<string, any>) ?? {}
    meta.inbound_items = (meta.inbound_items ?? []).filter((i: any) => i.id !== actionId)
    const db = getDb()
    await db.update(orderExchange).set({ metadata: meta }).where(eq(orderExchange.id, exchangeId))
    return this.getById(exchangeId)
  },

  // ── Inbound Shipping ─────────────────────────────────
  async addInboundShipping(exchangeId: string, payload: { shipping_option_id: string }) {
    const exchange = await this.getById(exchangeId)
    const meta = (exchange.exchange.metadata as Record<string, any>) ?? {}
    meta.inbound_shipping = [...(meta.inbound_shipping ?? []), { ...payload, id: generateId("act") }]
    const db = getDb()
    await db.update(orderExchange).set({ metadata: meta }).where(eq(orderExchange.id, exchangeId))
    return this.getById(exchangeId)
  },

  async updateInboundShipping(exchangeId: string, actionId: string, payload: { shipping_option_id?: string }) {
    const exchange = await this.getById(exchangeId)
    const meta = (exchange.exchange.metadata as Record<string, any>) ?? {}
    meta.inbound_shipping = (meta.inbound_shipping ?? []).map((s: any) => s.id === actionId ? { ...s, ...payload } : s)
    const db = getDb()
    await db.update(orderExchange).set({ metadata: meta }).where(eq(orderExchange.id, exchangeId))
    return this.getById(exchangeId)
  },

  async removeInboundShipping(exchangeId: string, actionId: string) {
    const exchange = await this.getById(exchangeId)
    const meta = (exchange.exchange.metadata as Record<string, any>) ?? {}
    meta.inbound_shipping = (meta.inbound_shipping ?? []).filter((s: any) => s.id !== actionId)
    const db = getDb()
    await db.update(orderExchange).set({ metadata: meta }).where(eq(orderExchange.id, exchangeId))
    return this.getById(exchangeId)
  },

  // ── Outbound Items ───────────────────────────────────
  async addOutboundItems(exchangeId: string, payload: { items: { variant_id: string; quantity: number }[] }) {
    const exchange = await this.getById(exchangeId)
    const meta = (exchange.exchange.metadata as Record<string, any>) ?? {}
    meta.outbound_items = [...(meta.outbound_items ?? []), ...payload.items.map(i => ({ ...i, id: generateId("act") }))]
    const db = getDb()
    await db.update(orderExchange).set({ metadata: meta }).where(eq(orderExchange.id, exchangeId))
    return this.getById(exchangeId)
  },

  async updateOutboundItem(exchangeId: string, actionId: string, payload: { quantity?: number }) {
    const exchange = await this.getById(exchangeId)
    const meta = (exchange.exchange.metadata as Record<string, any>) ?? {}
    meta.outbound_items = (meta.outbound_items ?? []).map((i: any) => i.id === actionId ? { ...i, ...payload } : i)
    const db = getDb()
    await db.update(orderExchange).set({ metadata: meta }).where(eq(orderExchange.id, exchangeId))
    return this.getById(exchangeId)
  },

  async removeOutboundItem(exchangeId: string, actionId: string) {
    const exchange = await this.getById(exchangeId)
    const meta = (exchange.exchange.metadata as Record<string, any>) ?? {}
    meta.outbound_items = (meta.outbound_items ?? []).filter((i: any) => i.id !== actionId)
    const db = getDb()
    await db.update(orderExchange).set({ metadata: meta }).where(eq(orderExchange.id, exchangeId))
    return this.getById(exchangeId)
  },

  // ── Outbound Shipping ────────────────────────────────
  async addOutboundShipping(exchangeId: string, payload: { shipping_option_id: string }) {
    const exchange = await this.getById(exchangeId)
    const meta = (exchange.exchange.metadata as Record<string, any>) ?? {}
    meta.outbound_shipping = [...(meta.outbound_shipping ?? []), { ...payload, id: generateId("act") }]
    const db = getDb()
    await db.update(orderExchange).set({ metadata: meta }).where(eq(orderExchange.id, exchangeId))
    return this.getById(exchangeId)
  },

  async updateOutboundShipping(exchangeId: string, actionId: string, payload: { shipping_option_id?: string }) {
    const exchange = await this.getById(exchangeId)
    const meta = (exchange.exchange.metadata as Record<string, any>) ?? {}
    meta.outbound_shipping = (meta.outbound_shipping ?? []).map((s: any) => s.id === actionId ? { ...s, ...payload } : s)
    const db = getDb()
    await db.update(orderExchange).set({ metadata: meta }).where(eq(orderExchange.id, exchangeId))
    return this.getById(exchangeId)
  },

  async removeOutboundShipping(exchangeId: string, actionId: string) {
    const exchange = await this.getById(exchangeId)
    const meta = (exchange.exchange.metadata as Record<string, any>) ?? {}
    meta.outbound_shipping = (meta.outbound_shipping ?? []).filter((s: any) => s.id !== actionId)
    const db = getDb()
    await db.update(orderExchange).set({ metadata: meta }).where(eq(orderExchange.id, exchangeId))
    return this.getById(exchangeId)
  },

  // ── Actions ──────────────────────────────────────────
  async request(exchangeId: string) {
    const db = getDb()
    const [updated] = await db.update(orderExchange).set({
      metadata: sql`jsonb_set(COALESCE(metadata, '{}'::jsonb), '{requested_at}', to_jsonb(now()::text))`,
    }).where(and(eq(orderExchange.id, exchangeId), isNull(orderExchange.deleted_at))).returning()
    if (!updated) throw new HTTPException(404, { message: "Exchange not found" })
    return { exchange: updated }
  },

  async cancel(id: string) {
    const db = getDb()
    const [updated] = await db.update(orderExchange).set({ canceled_at: sql`now()` })
      .where(and(eq(orderExchange.id, id), isNull(orderExchange.deleted_at))).returning()
    if (!updated) throw new HTTPException(404, { message: "Exchange not found" })
    return { exchange: updated }
  },
}
