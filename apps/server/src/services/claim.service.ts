import { and, count, desc, eq, isNull, sql } from "drizzle-orm"
import { generateId, getDb, orderClaim, orderClaimItem, orderChange, orderItem } from "@my-store/db"
import type { CreateClaimInput } from "@my-store/validators"
import type { AdminListClaimsParamsType } from "@my-store/validators/admin-list-params"
import {
  applyDateRangeConditions,
  applyInArrayCondition,
  listLimitOffset,
} from "../lib/infra/query/query-filters"
import { HTTPException } from "hono/http-exception"
import { claimCreateWorkflow } from "../workflows/claim-create"
import {
  addChangeShippingAction,
  getPendingChangeByClaimId,
  removeChangeShippingAction,
  updateChangeShippingAction,
} from "../lib/order/order-change-shipping"
import {
  addChangeOutboundItems,
  removeChangeOutboundItem,
  updateChangeOutboundItem,
} from "../lib/order/order-change-items"
import { notifyClaimRequested } from "../lib/mail/notify-customer"

export const claimService = {
  async list(query: AdminListClaimsParamsType) {
    const db = getDb()
    const { limit, offset } = listLimitOffset(query, { limit: 15, offset: 0 })
    const conditions = [isNull(orderClaim.deleted_at)]

    applyInArrayCondition(orderClaim.id, query.id, conditions)
    applyInArrayCondition(orderClaim.type, query.status, conditions)
    applyInArrayCondition(orderClaim.order_id, query.order_id, conditions)
    applyDateRangeConditions(
      orderClaim.created_at,
      query.created_at,
      conditions,
      sql,
    )
    applyDateRangeConditions(
      orderClaim.updated_at,
      query.updated_at,
      conditions,
      sql,
    )

    const [claims, [{ total }]] = await Promise.all([
      db
        .select()
        .from(orderClaim)
        .where(and(...conditions))
        .orderBy(desc(orderClaim.created_at))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(orderClaim).where(and(...conditions)),
    ])
    return { claims, count: Number(total), limit, offset }
  },

  async getById(id: string) {
    const db = getDb()
    const [item] = await db.select().from(orderClaim).where(and(eq(orderClaim.id, id), isNull(orderClaim.deleted_at))).limit(1)
    if (!item) throw new HTTPException(404, { message: "Claim not found" })

    const items = await db.select().from(orderClaimItem).where(eq(orderClaimItem.claim_id, id))
    const [change] = await db
      .select({ return_id: orderChange.return_id })
      .from(orderChange)
      .where(and(eq(orderChange.claim_id, id), isNull(orderChange.canceled_at)))
      .limit(1)
    return { claim: { ...item, items, return_id: change?.return_id ?? null } }
  },

  async create(input: CreateClaimInput) {
    const result = await claimCreateWorkflow.run({
      order_id: input.order_id, order_version: input.order_version,
      type: input.type, refund_amount: input.refund_amount,
      claim_items: input.claim_items ?? [],
    }) as { claimId: string }
    return this.getById(String(result.claimId))
  },

  async addInboundItems(claimId: string, payload: { items: { item_id: string; quantity: number; reason?: string; note?: string }[] }) {
    const claim = await this.getById(claimId)
    const db = getDb()

    for (const item of payload.items) {
      const citemId = generateId("clmitm")
      await db.insert(orderClaimItem).values({
        id: citemId, claim_id: claimId, item_id: item.item_id, reason: item.reason ?? null,
        quantity: String(item.quantity), raw_quantity: { amount: item.quantity, precision: 0 },
        note: item.note ?? null,
      })

      await db.update(orderItem).set({
        return_requested_quantity: sql`COALESCE(return_requested_quantity::numeric, 0) + ${item.quantity}`,
      }).where(and(eq(orderItem.item_id, item.item_id), eq(orderItem.order_id, claim.claim.order_id)))
    }

    return this.getById(claimId)
  },

  async updateInboundItem(claimId: string, itemId: string, payload: { quantity?: number; reason?: string; note?: string }) {
    const db = getDb()
    const updateData: Record<string, any> = {}
    if (payload.quantity !== undefined) {
      updateData.quantity = String(payload.quantity)
      updateData.raw_quantity = { amount: payload.quantity, precision: 0 }
    }
    if (payload.reason !== undefined) updateData.reason = payload.reason
    if (payload.note !== undefined) updateData.note = payload.note

    await db.update(orderClaimItem).set(updateData).where(and(eq(orderClaimItem.id, itemId), eq(orderClaimItem.claim_id, claimId)))
    return this.getById(claimId)
  },

  async removeInboundItem(claimId: string, itemId: string) {
    const db = getDb()
    await db.delete(orderClaimItem).where(and(eq(orderClaimItem.id, itemId), eq(orderClaimItem.claim_id, claimId)))
    return this.getById(claimId)
  },

  // ── Inbound Shipping ─────────────────────────────────

  async addInboundShipping(claimId: string, payload: { shipping_option_id: string }) {
    const change = await getPendingChangeByClaimId(claimId)
    await addChangeShippingAction({
      change,
      shipping_option_id: payload.shipping_option_id,
      isInbound: true,
      claim_id: claimId,
    })
    return this.getById(claimId)
  },

  async updateInboundShipping(claimId: string, actionId: string, payload: { shipping_option_id?: string }) {
    const change = await getPendingChangeByClaimId(claimId)
    await updateChangeShippingAction(change.id, actionId, payload)
    return this.getById(claimId)
  },

  async removeInboundShipping(claimId: string, actionId: string) {
    const change = await getPendingChangeByClaimId(claimId)
    await removeChangeShippingAction(change.id, actionId)
    return this.getById(claimId)
  },

  // ── Outbound shipping / items → order_change_action ──

  async addOutboundShipping(claimId: string, payload: { shipping_option_id: string }) {
    const change = await getPendingChangeByClaimId(claimId)
    await addChangeShippingAction({
      change,
      shipping_option_id: payload.shipping_option_id,
      isInbound: false,
      claim_id: claimId,
    })
    return this.getById(claimId)
  },

  async updateOutboundShipping(claimId: string, actionId: string, payload: { shipping_option_id?: string }) {
    const change = await getPendingChangeByClaimId(claimId)
    await updateChangeShippingAction(change.id, actionId, payload)
    return this.getById(claimId)
  },

  async removeOutboundShipping(claimId: string, actionId: string) {
    const change = await getPendingChangeByClaimId(claimId)
    await removeChangeShippingAction(change.id, actionId)
    return this.getById(claimId)
  },

  async addOutboundItems(claimId: string, payload: { items: { variant_id: string; quantity: number }[] }) {
    const change = await getPendingChangeByClaimId(claimId)
    await addChangeOutboundItems({
      change,
      items: payload.items,
      claim_id: claimId,
    })
    return this.getById(claimId)
  },

  async updateOutboundItem(claimId: string, actionId: string, payload: { quantity?: number }) {
    const change = await getPendingChangeByClaimId(claimId)
    await updateChangeOutboundItem(change.id, actionId, payload)
    return this.getById(claimId)
  },

  async removeOutboundItem(claimId: string, actionId: string) {
    const change = await getPendingChangeByClaimId(claimId)
    await removeChangeOutboundItem(change.id, actionId)
    return this.getById(claimId)
  },

  // ── Claim Request / Shipment ─────────────────────────

  async request(
    claimId: string,
    input?: { no_notification?: boolean },
  ) {
    const db = getDb()
    const { claim: existing } = await this.getById(claimId)
    const meta: Record<string, unknown> = {
      ...(((existing as { metadata?: Record<string, unknown> }).metadata) ??
        {}),
      requested_at: new Date().toISOString(),
    }
    if (input?.no_notification != null) {
      meta.no_notification = input.no_notification
    }
    const [updated] = await db.update(orderClaim).set({
      metadata: meta,
    }).where(and(eq(orderClaim.id, claimId), isNull(orderClaim.deleted_at))).returning()
    if (!updated) throw new HTTPException(404, { message: "Claim not found" })
    await notifyClaimRequested(
      claimId,
      existing.claim.order_id,
      input?.no_notification,
    )
    return { claim: updated }
  },

  async cancelRequest(claimId: string) {
    const db = getDb()
    const [updated] = await db.update(orderClaim).set({
      metadata: sql`COALESCE(metadata, '{}'::jsonb) - 'requested_at'`,
    }).where(and(eq(orderClaim.id, claimId), isNull(orderClaim.deleted_at))).returning()
    if (!updated) throw new HTTPException(404, { message: "Claim not found" })
    return { claim: updated, deleted: true }
  },

  async cancel(id: string) {
    const db = getDb()
    const [updated] = await db.update(orderClaim).set({ canceled_at: sql`now()` })
      .where(and(eq(orderClaim.id, id), isNull(orderClaim.deleted_at))).returning()
    if (!updated) throw new HTTPException(404, { message: "Claim not found" })
    return { claim: updated }
  },
}
