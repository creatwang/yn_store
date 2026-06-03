import { and, count, desc, eq, isNull, sql } from "drizzle-orm"
import { generateId, getDb, orderExchange, orderChange } from "@my-store/db"
import type { CreateExchangeInput } from "@my-store/validators"
import type { AdminListExchangesParamsType } from "@my-store/validators/admin-list-params"
import {
  applyDateRangeConditions,
  applyInArrayCondition,
  listLimitOffset,
} from "../lib/query-filters"
import { HTTPException } from "hono/http-exception"
import { exchangeCreateWorkflow } from "../workflows/exchange-create"
import {
  addChangeShippingAction,
  getPendingChangeByExchangeId,
  removeChangeShippingAction,
  updateChangeShippingAction,
} from "../lib/order-change-shipping"

export const exchangeService = {
  async list(query: AdminListExchangesParamsType) {
    const db = getDb()
    const { limit, offset } = listLimitOffset(query, { limit: 15, offset: 0 })
    const conditions = [isNull(orderExchange.deleted_at)]
    applyInArrayCondition(orderExchange.id, query.id, conditions)
    applyInArrayCondition(orderExchange.order_id, query.order_id, conditions)
    applyDateRangeConditions(
      orderExchange.created_at,
      query.created_at,
      conditions,
      sql,
    )
    applyDateRangeConditions(
      orderExchange.updated_at,
      query.updated_at,
      conditions,
      sql,
    )
    const [exchanges, [{ total }]] = await Promise.all([
      db
        .select()
        .from(orderExchange)
        .where(and(...conditions))
        .orderBy(desc(orderExchange.created_at))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(orderExchange).where(and(...conditions)),
    ])
    return { exchanges, count: Number(total), limit, offset }
  },

  async getById(id: string) {
    const db = getDb()
    const [item] = await db.select().from(orderExchange).where(and(eq(orderExchange.id, id), isNull(orderExchange.deleted_at))).limit(1)
    if (!item) throw new HTTPException(404, { message: "Exchange not found" })
    const [change] = await db
      .select({ return_id: orderChange.return_id })
      .from(orderChange)
      .where(and(eq(orderChange.exchange_id, id), isNull(orderChange.canceled_at)))
      .limit(1)
    return { exchange: { ...item, return_id: change?.return_id ?? null } }
  },

  async create(input: CreateExchangeInput) {
    const result = await exchangeCreateWorkflow.run({
      order_id: input.order_id, order_version: input.order_version,
      difference_due: input.difference_due, allow_backorder: input.allow_backorder,
    }) as { exchangeId: string }
    return this.getById(String(result.exchangeId))
  },

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
    const change = await getPendingChangeByExchangeId(exchangeId)
    await addChangeShippingAction({
      change,
      shipping_option_id: payload.shipping_option_id,
      isInbound: true,
      exchange_id: exchangeId,
    })
    return this.getById(exchangeId)
  },

  async updateInboundShipping(exchangeId: string, actionId: string, payload: { shipping_option_id?: string }) {
    const change = await getPendingChangeByExchangeId(exchangeId)
    await updateChangeShippingAction(change.id, actionId, payload)
    return this.getById(exchangeId)
  },

  async removeInboundShipping(exchangeId: string, actionId: string) {
    const change = await getPendingChangeByExchangeId(exchangeId)
    await removeChangeShippingAction(change.id, actionId)
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
    const change = await getPendingChangeByExchangeId(exchangeId)
    await addChangeShippingAction({
      change,
      shipping_option_id: payload.shipping_option_id,
      isInbound: false,
      exchange_id: exchangeId,
    })
    return this.getById(exchangeId)
  },

  async updateOutboundShipping(exchangeId: string, actionId: string, payload: { shipping_option_id?: string }) {
    const change = await getPendingChangeByExchangeId(exchangeId)
    await updateChangeShippingAction(change.id, actionId, payload)
    return this.getById(exchangeId)
  },

  async removeOutboundShipping(exchangeId: string, actionId: string) {
    const change = await getPendingChangeByExchangeId(exchangeId)
    await removeChangeShippingAction(change.id, actionId)
    return this.getById(exchangeId)
  },

  // ── Actions ──────────────────────────────────────────
  async request(
    exchangeId: string,
    input?: { no_notification?: boolean },
  ) {
    const db = getDb()
    const { exchange: existing } = await this.getById(exchangeId)
    const meta: Record<string, unknown> = {
      ...(((existing as { metadata?: Record<string, unknown> }).metadata) ??
        {}),
      requested_at: new Date().toISOString(),
    }
    if (input?.no_notification != null) {
      meta.no_notification = input.no_notification
    }
    const [updated] = await db.update(orderExchange).set({
      metadata: meta,
    }).where(and(eq(orderExchange.id, exchangeId), isNull(orderExchange.deleted_at))).returning()
    if (!updated) throw new HTTPException(404, { message: "Exchange not found" })
    return { exchange: updated }
  },

  async cancelRequest(id: string) {
    const db = getDb()
    await db
      .update(orderChange)
      .set({ canceled_at: sql`now()`, canceled_by: "admin" })
      .where(and(eq(orderChange.exchange_id, id), isNull(orderChange.confirmed_at), isNull(orderChange.canceled_at)))
    return this.getById(id)
  },

  async cancel(id: string) {
    const db = getDb()
    const [updated] = await db.update(orderExchange).set({ canceled_at: sql`now()` })
      .where(and(eq(orderExchange.id, id), isNull(orderExchange.deleted_at))).returning()
    if (!updated) throw new HTTPException(404, { message: "Exchange not found" })
    return { exchange: updated }
  },
}
