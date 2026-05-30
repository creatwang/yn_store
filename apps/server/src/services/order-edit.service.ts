import { and, desc, eq, isNull, sql } from "drizzle-orm"
import { generateId, getDb, order, orderChange, orderItem, orderLineItem, orderSummary } from "@my-store/db"
import { HTTPException } from "hono/http-exception"

export const orderEditService = {
  async list(orderId: string) {
    const db = getDb()
    const changes = await db.select().from(orderChange)
      .where(and(eq(orderChange.order_id, orderId), eq(orderChange.change_type, "edit")))
      .orderBy(desc(orderChange.created_at))
    return { order_edits: changes }
  },

  async getById(id: string) {
    const db = getDb()
    const [item] = await db.select().from(orderChange).where(and(eq(orderChange.id, id), eq(orderChange.change_type, "edit"))).limit(1)
    if (!item) throw new HTTPException(404, { message: "Order edit not found" })
    return { order_edit: item }
  },

  async create(orderId: string) {
    const db = getDb()
    const [ord] = await db.select().from(order).where(and(eq(order.id, orderId), isNull(order.deleted_at))).limit(1)
    if (!ord) throw new HTTPException(404, { message: "Order not found" })

    const newVersion = (ord.version ?? 1) + 1
    const changeId = generateId("ordch")
    const [created] = await db.insert(orderChange).values({
      id: changeId, order_id: orderId, version: newVersion,
      change_type: "edit", created_by: "admin",
    }).returning()

    return { order_edit: created }
  },

  async addItems(editId: string, items: { variant_id: string; quantity: number; unit_price?: number }[]) {
    const db = getDb()
    const [edit] = await db.select().from(orderChange).where(eq(orderChange.id, editId)).limit(1)
    if (!edit) throw new HTTPException(404, { message: "Order edit not found" })

    const meta = (edit.metadata as Record<string, any>) ?? {}
    const addedItems = meta.added_items ?? []
    for (const item of items) {
      const lineItemId = generateId("olitm")
      const orderItemId = generateId("orditm")

      await db.insert(orderLineItem).values({
        id: lineItemId, title: "", variant_id: item.variant_id ?? null,
        requires_shipping: true, is_giftcard: false, is_discountable: true, is_tax_inclusive: false,
        unit_price: item.unit_price ? String(item.unit_price) : null,
        raw_unit_price: item.unit_price ? { amount: item.unit_price, precision: 2 } : null,
      })

      await db.insert(orderItem).values({
        id: orderItemId, version: 1, order_id: edit.order_id, item_id: lineItemId,
        quantity: String(item.quantity), raw_quantity: { amount: item.quantity, precision: 0 },
        unit_price: item.unit_price ? String(item.unit_price) : null,
        raw_unit_price: item.unit_price ? { amount: item.unit_price, precision: 2 } : null,
        fulfilled_quantity: "0",
        shipped_quantity: "0",
        delivered_quantity: "0",
        return_requested_quantity: "0",
        return_received_quantity: "0",
        return_dismissed_quantity: "0",
        written_off_quantity: "0",
      })

      addedItems.push({ line_item_id: lineItemId, order_item_id: orderItemId, variant_id: item.variant_id, quantity: item.quantity })
    }

    meta.added_items = addedItems
    await db.update(orderChange).set({ metadata: meta }).where(eq(orderChange.id, editId))
    return this.getById(editId)
  },

  async updateOriginalItem(editId: string, itemId: string, payload: { quantity?: number; unit_price?: number }) {
    const db = getDb()
    const [edit] = await db.select().from(orderChange).where(eq(orderChange.id, editId)).limit(1)
    if (!edit) throw new HTTPException(404, { message: "Order edit not found" })

    const meta = (edit.metadata as Record<string, any>) ?? {}
    const updatedItems = meta.updated_items ?? []
    const existing = updatedItems.findIndex((i: any) => i.item_id === itemId)
    const change = { item_id: itemId, ...payload }
    if (existing >= 0) updatedItems[existing] = { ...updatedItems[existing], ...payload }
    else updatedItems.push(change)
    meta.updated_items = updatedItems

    await db.update(orderChange).set({ metadata: meta }).where(eq(orderChange.id, editId))
    return this.getById(editId)
  },

  async updateAddedItem(editId: string, itemId: string, payload: { quantity?: number }) {
    return this.updateOriginalItem(editId, itemId, payload)
  },

  async removeAddedItem(editId: string, itemId: string) {
    const db = getDb()
    const [edit] = await db.select().from(orderChange).where(eq(orderChange.id, editId)).limit(1)
    if (!edit) throw new HTTPException(404, { message: "Order edit not found" })

    const meta = (edit.metadata as Record<string, any>) ?? {}
    meta.added_items = (meta.added_items ?? []).filter((i: any) => i.line_item_id !== itemId)
    await db.update(orderChange).set({ metadata: meta }).where(eq(orderChange.id, editId))
    return this.getById(editId)
  },

  async request(editId: string) {
    const db = getDb()
    const [updated] = await db.update(orderChange).set({
      requested_at: sql`now()`, requested_by: "admin",
    }).where(and(eq(orderChange.id, editId), isNull(orderChange.canceled_at))).returning()
    if (!updated) throw new HTTPException(404, { message: "Order edit not found" })
    return { order_edit: updated }
  },

  async confirm(editId: string) {
    const db = getDb()
    const [updated] = await db.update(orderChange).set({
      confirmed_at: sql`now()`, confirmed_by: "admin",
    }).where(and(eq(orderChange.id, editId), isNull(orderChange.canceled_at))).returning()
    if (!updated) throw new HTTPException(404, { message: "Order edit not found" })
    return { order_edit: updated }
  },

  async cancel(editId: string) {
    const db = getDb()
    const [updated] = await db.update(orderChange).set({
      canceled_at: sql`now()`, canceled_by: "admin",
    }).where(eq(orderChange.id, editId)).returning()
    if (!updated) throw new HTTPException(404, { message: "Order edit not found" })
    return { order_edit: updated }
  },

  async _getMeta(editId: string) {
    const db = getDb()
    const [edit] = await db.select().from(orderChange).where(eq(orderChange.id, editId)).limit(1)
    if (!edit) throw new HTTPException(404, { message: "Order edit not found" })
    return { edit, meta: (edit.metadata as Record<string, any>) ?? {} }
  },

  async _saveMeta(editId: string, meta: Record<string, unknown>) {
    const db = getDb()
    await db.update(orderChange).set({ metadata: meta }).where(eq(orderChange.id, editId))
    return this.getById(editId)
  },

  async addShippingMethod(editId: string, data: { shipping_option_id: string; amount?: number; name?: string }) {
    const { meta } = await this._getMeta(editId)
    const actionId = generateId("ordedshp")
    meta.shipping_methods = [...(meta.shipping_methods ?? []), { id: actionId, ...data }]
    return this._saveMeta(editId, meta)
  },

  async updateShippingMethod(editId: string, actionId: string, data: Record<string, unknown>) {
    const { meta } = await this._getMeta(editId)
    meta.shipping_methods = (meta.shipping_methods ?? []).map((s: any) =>
      s.id === actionId ? { ...s, ...data } : s,
    )
    return this._saveMeta(editId, meta)
  },

  async removeShippingMethod(editId: string, actionId: string) {
    const { meta } = await this._getMeta(editId)
    meta.shipping_methods = (meta.shipping_methods ?? []).filter((s: any) => s.id !== actionId)
    return this._saveMeta(editId, meta)
  },
}
