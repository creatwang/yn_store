import { and, count, desc, eq, isNull, sql } from "drizzle-orm"
import { generateId, getDb, orderClaim, orderClaimItem, orderChange, orderItem } from "@my-store/db"
import type { CreateClaimInput, ListClaimsQuery } from "@my-store/validators"
import { HTTPException } from "hono/http-exception"
import { createCompanionReturn } from "./order/admin-order-preview"

export const claimService = {
  async list(query: ListClaimsQuery) {
    const db = getDb()
    const conditions = [isNull(orderClaim.deleted_at)]

    if (query.status) conditions.push(eq(orderClaim.type, query.status))
    if (query.order_id) conditions.push(eq(orderClaim.order_id, query.order_id))

    const [claims, [{ total }]] = await Promise.all([
      db.select().from(orderClaim).where(and(...conditions)).orderBy(desc(orderClaim.created_at)).limit(query.limit).offset(query.offset),
      db.select({ total: count() }).from(orderClaim).where(and(...conditions)),
    ])
    return { claims, count: Number(total) }
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
    const db = getDb()
    const id = generateId("claim")

    const [created] = await db.insert(orderClaim).values({
      id, order_id: input.order_id, order_version: input.order_version ?? 1,
      type: input.type ?? "refund",
      refund_amount: input.refund_amount ? String(input.refund_amount) : null,
      raw_refund_amount: input.refund_amount ? { amount: input.refund_amount, precision: 2 } : null,
      created_by: "admin",
    }).returning()

    if (input.claim_items?.length) {
      for (const ci of input.claim_items) {
        const citemId = generateId("clmitm")
        await db.insert(orderClaimItem).values({
          id: citemId, claim_id: id, item_id: ci.item_id, reason: ci.reason ?? null,
          quantity: String(ci.quantity), raw_quantity: { amount: ci.quantity, precision: 0 },
          is_additional_item: ci.is_additional_item ?? false, note: ci.note ?? null,
        })

        await db.update(orderItem).set({
          return_requested_quantity: sql`COALESCE(return_requested_quantity::numeric, 0) + ${ci.quantity}`,
        }).where(and(eq(orderItem.item_id, ci.item_id), eq(orderItem.order_id, input.order_id)))
      }
    }

    const returnId = await createCompanionReturn(input.order_id, input.order_version ?? 1)

    await db.insert(orderChange).values({
      id: generateId("ordch"), order_id: input.order_id, claim_id: id, return_id: returnId,
      version: input.order_version ?? 1, change_type: "claim", created_by: "admin",
    })

    return this.getById(id)
  },

  // ── Inbound Items ────────────────────────────────────

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
    const claim = await this.getById(claimId)
    const meta = (claim.claim.metadata as Record<string, any>) ?? {}
    meta.inbound_shipping = [...(meta.inbound_shipping ?? []), { ...payload, id: generateId("act") }]
    const db = getDb()
    await db.update(orderClaim).set({ metadata: meta }).where(eq(orderClaim.id, claimId))
    return this.getById(claimId)
  },

  async updateInboundShipping(claimId: string, actionId: string, payload: { shipping_option_id?: string }) {
    const claim = await this.getById(claimId)
    const meta = (claim.claim.metadata as Record<string, any>) ?? {}
    const items = (meta.inbound_shipping ?? []).map((s: any) => s.id === actionId ? { ...s, ...payload } : s)
    meta.inbound_shipping = items
    const db = getDb()
    await db.update(orderClaim).set({ metadata: meta }).where(eq(orderClaim.id, claimId))
    return this.getById(claimId)
  },

  async removeInboundShipping(claimId: string, actionId: string) {
    const claim = await this.getById(claimId)
    const meta = (claim.claim.metadata as Record<string, any>) ?? {}
    meta.inbound_shipping = (meta.inbound_shipping ?? []).filter((s: any) => s.id !== actionId)
    const db = getDb()
    await db.update(orderClaim).set({ metadata: meta }).where(eq(orderClaim.id, claimId))
    return this.getById(claimId)
  },

  // ── Outbound Items / Shipping (stored in metadata for action tracking) ──

  async addOutboundShipping(claimId: string, payload: { shipping_option_id: string }) {
    const claim = await this.getById(claimId)
    const meta = (claim.claim.metadata as Record<string, any>) ?? {}
    meta.outbound_shipping = [...(meta.outbound_shipping ?? []), { ...payload, id: generateId("act") }]
    const db = getDb()
    await db.update(orderClaim).set({ metadata: meta }).where(eq(orderClaim.id, claimId))
    return this.getById(claimId)
  },

  async updateOutboundShipping(claimId: string, actionId: string, payload: { shipping_option_id?: string }) {
    const claim = await this.getById(claimId)
    const meta = (claim.claim.metadata as Record<string, any>) ?? {}
    const items = (meta.outbound_shipping ?? []).map((s: any) => s.id === actionId ? { ...s, ...payload } : s)
    meta.outbound_shipping = items
    const db = getDb()
    await db.update(orderClaim).set({ metadata: meta }).where(eq(orderClaim.id, claimId))
    return this.getById(claimId)
  },

  async removeOutboundShipping(claimId: string, actionId: string) {
    const claim = await this.getById(claimId)
    const meta = (claim.claim.metadata as Record<string, any>) ?? {}
    meta.outbound_shipping = (meta.outbound_shipping ?? []).filter((s: any) => s.id !== actionId)
    const db = getDb()
    await db.update(orderClaim).set({ metadata: meta }).where(eq(orderClaim.id, claimId))
    return this.getById(claimId)
  },

  async addOutboundItems(claimId: string, payload: { items: { variant_id: string; quantity: number }[] }) {
    const claim = await this.getById(claimId)
    const meta = (claim.claim.metadata as Record<string, any>) ?? {}
    meta.outbound_items = [
      ...(meta.outbound_items ?? []),
      ...payload.items.map((i) => ({ ...i, id: generateId("act") })),
    ]
    const db = getDb()
    await db.update(orderClaim).set({ metadata: meta }).where(eq(orderClaim.id, claimId))
    return this.getById(claimId)
  },

  async updateOutboundItem(claimId: string, actionId: string, payload: { quantity?: number }) {
    const claim = await this.getById(claimId)
    const meta = (claim.claim.metadata as Record<string, any>) ?? {}
    meta.outbound_items = (meta.outbound_items ?? []).map((i: any) =>
      i.id === actionId ? { ...i, ...payload } : i,
    )
    const db = getDb()
    await db.update(orderClaim).set({ metadata: meta }).where(eq(orderClaim.id, claimId))
    return this.getById(claimId)
  },

  async removeOutboundItem(claimId: string, actionId: string) {
    const claim = await this.getById(claimId)
    const meta = (claim.claim.metadata as Record<string, any>) ?? {}
    meta.outbound_items = (meta.outbound_items ?? []).filter((i: any) => i.id !== actionId)
    const db = getDb()
    await db.update(orderClaim).set({ metadata: meta }).where(eq(orderClaim.id, claimId))
    return this.getById(claimId)
  },

  // ── Claim Request / Shipment ─────────────────────────

  async request(claimId: string) {
    const db = getDb()
    const [updated] = await db.update(orderClaim).set({
      metadata: sql`jsonb_set(COALESCE(metadata, '{}'::jsonb), '{requested_at}', to_jsonb(now()::text))`,
    }).where(and(eq(orderClaim.id, claimId), isNull(orderClaim.deleted_at))).returning()
    if (!updated) throw new HTTPException(404, { message: "Claim not found" })
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
