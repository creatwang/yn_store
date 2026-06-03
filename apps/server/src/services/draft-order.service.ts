import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  order,
  orderAddress,
  orderChange,
  orderLineItem,
  orderItem,
} from "@my-store/db"
import { runInTransaction } from "../lib/transaction"
import type { CreateOrderInput, UpdateOrderInput } from "@my-store/validators"
import { HTTPException } from "hono/http-exception"
import { variantService } from "./variant.service"

export const draftOrderService = {
  async list(query: { limit?: number; offset?: number; q?: string; status?: string }) {
    const db = getDb()
    const conditions = [
      isNull(order.deleted_at),
      eq(order.is_draft_order, true),
    ]

    if (query.status) conditions.push(eq(order.status, query.status))
    if (query.q) conditions.push(sql`${order.email} ILIKE ${`%${query.q}%`}`)

    const orders = await db.select().from(order)
      .where(and(...conditions))
      .orderBy(desc(order.created_at))
      .limit(query.limit ?? 50)
      .offset(query.offset ?? 0)

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(order)
      .where(and(...conditions))

    return {
      draft_orders: orders,
      count: Number(total),
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    }
  },

  async getById(id: string) {
    const db = getDb()
    const [item] = await db.select().from(order)
      .where(and(eq(order.id, id), eq(order.is_draft_order, true), isNull(order.deleted_at)))
      .limit(1)
    if (!item) throw new HTTPException(404, { message: "Draft order not found" })

    const lineRows = await db
      .select()
      .from(orderLineItem)
      .innerJoin(orderItem, eq(orderLineItem.id, orderItem.item_id))
      .where(eq(orderItem.order_id, id))
      .orderBy(desc(orderLineItem.created_at))

    const [change] = await db.select().from(orderChange).where(and(
      eq(orderChange.order_id, id),
      eq(orderChange.change_type, "draft_edit"),
      isNull(orderChange.canceled_at),
    )).limit(1)

    const meta = (change?.metadata as Record<string, unknown>) ?? {}
    const addedItems = (meta.added_items as Record<string, unknown>[]) ?? []

    const items = lineRows.map((row) => {
      const li = row.order_line_item
      const oi = row.order_item
      const action = addedItems.find(
        (a) => a.line_item_id === li.id || a.order_item_id === oi.id,
      )
      return {
        id: oi.id,
        line_item_id: li.id,
        title: li.title,
        variant_id: li.variant_id,
        quantity: Number(oi.quantity ?? 1),
        unit_price: oi.unit_price ? Number(oi.unit_price) : null,
        edit_action_id: action?.id ?? null,
      }
    })

    return {
      draft_order: {
        ...item,
        items,
        draft_shipping_methods: meta.shipping_methods ?? [],
        draft_promotions: meta.promotions ?? [],
        order_change_id: change?.id ?? null,
      },
    }
  },

  async create(input: CreateOrderInput) {
    const id = generateId("order")

    const created = await runInTransaction(async (tx) => {
      let shippingAddrId: string | null = null
      let billingAddrId: string | null = null

      if (input.shipping_address) {
        shippingAddrId = generateId("ordaddr")
        await tx.insert(orderAddress).values({
          id: shippingAddrId,
          ...input.shipping_address,
          metadata: input.shipping_address.metadata ?? null,
        })
      }
      if (input.billing_address) {
        billingAddrId = generateId("ordaddr")
        await tx.insert(orderAddress).values({
          id: billingAddrId,
          ...input.billing_address,
          metadata: input.billing_address.metadata ?? null,
        })
      }

      const [row] = await tx.insert(order).values({
        id,
        region_id: input.region_id ?? null,
        customer_id: input.customer_id ?? null,
        sales_channel_id: input.sales_channel_id ?? null,
        email: input.email ?? null,
        currency_code: input.currency_code ?? "USD",
        status: "draft",
        is_draft_order: true,
        shipping_address_id: shippingAddrId,
        billing_address_id: billingAddrId,
        metadata: input.metadata ?? null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      }).returning()

      return row
    })

    return { draft_order: created }
  },

  async update(id: string, input: UpdateOrderInput) {
    const db = getDb()
    const [updated] = await db.update(order).set({
      ...(input.region_id !== undefined && { region_id: input.region_id }),
      ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
      ...(input.sales_channel_id !== undefined && { sales_channel_id: input.sales_channel_id }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.currency_code !== undefined && { currency_code: input.currency_code }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
      updated_at: sql`now()`,
    }).where(and(eq(order.id, id), eq(order.is_draft_order, true), isNull(order.deleted_at))).returning()
    if (!updated) throw new HTTPException(404, { message: "Draft order not found" })
    return { draft_order: updated }
  },

  async delete(id: string) {
    const db = getDb()
    await db.update(order).set({ deleted_at: sql`now()` })
      .where(and(eq(order.id, id), eq(order.is_draft_order, true)))
    return { id, object: "draft-order", deleted: true }
  },

  async convertToOrder(id: string) {
    const db = getDb()
    const [updated] = await db.update(order).set({
      is_draft_order: false,
      status: "pending",
      updated_at: sql`now()`,
    }).where(and(eq(order.id, id), eq(order.is_draft_order, true), isNull(order.deleted_at))).returning()
    if (!updated) throw new HTTPException(404, { message: "Draft order not found" })
    return { order: updated }
  },

  // ── Edit workflow ────────────────────────────────────

  async beginEdit(id: string) {
    const db = getDb()
    const [ord] = await db.select().from(order).where(and(eq(order.id, id), eq(order.is_draft_order, true))).limit(1)
    if (!ord) throw new HTTPException(404, { message: "Draft order not found" })

    const changeId = generateId("ordch")
    const [change] = await db.insert(orderChange).values({
      id: changeId,
      order_id: id,
      version: (ord.version ?? 1) + 1,
      change_type: "draft_edit",
      created_by: "admin",
    }).returning()

    return { draft_order_preview: { order: ord, order_change: change } }
  },

  async cancelEdit(id: string) {
    const db = getDb()
    const [active] = await db.select().from(orderChange).where(and(
      eq(orderChange.order_id, id),
      eq(orderChange.change_type, "draft_edit"),
      isNull(orderChange.canceled_at),
      isNull(orderChange.confirmed_at),
    )).limit(1)

    if (active) {
      await db.update(orderChange).set({ canceled_at: sql`now()`, canceled_by: "admin" })
        .where(eq(orderChange.id, active.id))
    }

    return { id, object: "draft-order-edit", deleted: true }
  },

  async requestEdit(id: string) {
    const db = getDb()
    const [active] = await db.select().from(orderChange).where(and(
      eq(orderChange.order_id, id),
      eq(orderChange.change_type, "draft_edit"),
      isNull(orderChange.canceled_at),
      isNull(orderChange.confirmed_at),
    )).limit(1)

    if (!active) throw new HTTPException(400, { message: "No active draft order edit" })

    const [updated] = await db.update(orderChange).set({
      requested_at: sql`now()`,
      requested_by: "admin",
    }).where(eq(orderChange.id, active.id)).returning()

    return { draft_order_preview: { order_change: updated } }
  },

  async confirmEdit(id: string) {
    const db = getDb()
    const [active] = await db.select().from(orderChange).where(and(
      eq(orderChange.order_id, id),
      eq(orderChange.change_type, "draft_edit"),
      isNull(orderChange.canceled_at),
    )).limit(1)

    if (!active) throw new HTTPException(400, { message: "No draft order edit to confirm" })

    await db.update(orderChange).set({
      confirmed_at: sql`now()`,
      confirmed_by: "admin",
    }).where(eq(orderChange.id, active.id))

    return { draft_order_preview: { order_change: active } }
  },

  // ── Items management ─────────────────────────────────

  async addItems(id: string, items: { variant_id?: string; quantity: number; unit_price?: number; title?: string }[]) {
    const db = getDb()
    const [activeEdit] = await db.select().from(orderChange).where(and(
      eq(orderChange.order_id, id),
      eq(orderChange.change_type, "draft_edit"),
      isNull(orderChange.canceled_at),
      isNull(orderChange.confirmed_at),
    )).limit(1)

    if (!activeEdit) {
      await this.beginEdit(id)
    }

    const meta = await this._getEditMeta(id)

    const actions = []
    for (const item of items) {
      const actionId = generateId("act")
      const lineItemId = generateId("olitm")
      const orderItemId = generateId("orditm")

      let lineTitle = item.title?.trim() ?? ""
      let productId: string | null = null

      if (item.variant_id) {
        try {
          const variant = await variantService.getVariantById(item.variant_id)
          if (!lineTitle) {
            lineTitle = variant.title
          }
          productId = variant.product_id ?? null
        } catch {
          // 变体已删除时仍允许写入 variant_id
        }
      }

      const resolvedUnitPrice =
        item.unit_price != null && Number.isFinite(item.unit_price)
          ? item.unit_price
          : 0
      const rawUnitPrice = {
        amount: resolvedUnitPrice,
        precision: 2,
      }

      await db.insert(orderLineItem).values({
        id: lineItemId,
        title: lineTitle || "Item",
        variant_id: item.variant_id ?? null,
        product_id: productId,
        requires_shipping: true,
        is_giftcard: false,
        is_discountable: true,
        is_tax_inclusive: false,
        unit_price: String(resolvedUnitPrice),
        raw_unit_price: rawUnitPrice,
      })

      await db.insert(orderItem).values({
        id: orderItemId, version: 1, order_id: id, item_id: lineItemId,
        quantity: String(item.quantity), raw_quantity: { amount: item.quantity, precision: 0 },
        unit_price: String(resolvedUnitPrice),
        raw_unit_price: rawUnitPrice,
        fulfilled_quantity: "0",
        shipped_quantity: "0",
        delivered_quantity: "0",
        return_requested_quantity: "0",
        return_received_quantity: "0",
        return_dismissed_quantity: "0",
        written_off_quantity: "0",
      })

      actions.push({ id: actionId, line_item_id: lineItemId, order_item_id: orderItemId, ...item })
    }

    meta.added_items = [...(meta.added_items ?? []), ...actions]
    await this._saveEditMeta(id, meta)
    return this._preview(id)
  },

  async updateItemAction(id: string, actionId: string, data: { quantity?: number; unit_price?: number }) {
    const db = getDb()
    const meta = await this._getEditMeta(id)
    meta.added_items = (meta.added_items ?? []).map((a: any) =>
      a.id === actionId ? { ...a, ...data } : a
    )
    await this._saveEditMeta(id, meta)
    return this._preview(id)
  },

  async removeItemAction(id: string, actionId: string) {
    const db = getDb()
    const meta = await this._getEditMeta(id)
    const item = (meta.added_items ?? []).find((a: any) => a.id === actionId)
    if (item?.line_item_id) {
      await db.delete(orderItem).where(eq(orderItem.item_id, item.line_item_id))
      await db.delete(orderLineItem).where(eq(orderLineItem.id, item.line_item_id))
    }
    meta.added_items = (meta.added_items ?? []).filter((a: any) => a.id !== actionId)
    await this._saveEditMeta(id, meta)
    return this._preview(id)
  },

  // ── Shipping methods ─────────────────────────────────

  async addShippingMethod(id: string, data: { shipping_option_id: string; amount?: number }) {
    const db = getDb()
    const [activeEdit] = await db.select().from(orderChange).where(and(
      eq(orderChange.order_id, id),
      eq(orderChange.change_type, "draft_edit"),
      isNull(orderChange.canceled_at),
      isNull(orderChange.confirmed_at),
    )).limit(1)

    if (!activeEdit) {
      await this.beginEdit(id)
    }

    const meta = await this._getEditMeta(id)
    const actionId = generateId("act")
    meta.shipping_methods = [...(meta.shipping_methods ?? []), { id: actionId, ...data }]
    await this._saveEditMeta(id, meta)
    return this._preview(id)
  },

  async updateShippingMethodAction(id: string, actionId: string, data: { shipping_option_id?: string; amount?: number }) {
    const meta = await this._getEditMeta(id)
    meta.shipping_methods = (meta.shipping_methods ?? []).map((s: any) =>
      s.id === actionId ? { ...s, ...data } : s
    )
    await this._saveEditMeta(id, meta)
    return this._preview(id)
  },

  async removeShippingMethodAction(id: string, actionId: string) {
    const meta = await this._getEditMeta(id)
    meta.shipping_methods = (meta.shipping_methods ?? []).filter((s: any) => s.id !== actionId)
    await this._saveEditMeta(id, meta)
    return this._preview(id)
  },

  // ── Promotions ───────────────────────────────────────

  async addPromotions(id: string, data: { code: string }) {
    const meta = await this._getEditMeta(id)
    const actionId = generateId("act")
    meta.promotions = [...(meta.promotions ?? []), { id: actionId, code: data.code }]
    await this._saveEditMeta(id, meta)
    return this._preview(id)
  },

  async removePromotionAction(id: string, actionId: string) {
    const meta = await this._getEditMeta(id)
    meta.promotions = (meta.promotions ?? []).filter((p: any) => p.id !== actionId)
    await this._saveEditMeta(id, meta)
    return this._preview(id)
  },

  // ── Helpers ──────────────────────────────────────────

  async _getEditMeta(id: string) {
    const db = getDb()
    const [change] = await db.select().from(orderChange).where(and(
      eq(orderChange.order_id, id),
      eq(orderChange.change_type, "draft_edit"),
      isNull(orderChange.canceled_at),
      isNull(orderChange.confirmed_at),
    )).limit(1)
    return (change?.metadata as Record<string, any>) ?? {}
  },

  async _saveEditMeta(id: string, meta: Record<string, any>) {
    const db = getDb()
    await db.update(orderChange).set({ metadata: meta })
      .where(and(
        eq(orderChange.order_id, id),
        eq(orderChange.change_type, "draft_edit"),
        isNull(orderChange.canceled_at),
      ))
  },

  async _preview(id: string) {
    const db = getDb()
    const [ord] = await db.select().from(order)
      .where(and(eq(order.id, id), eq(order.is_draft_order, true)))
      .limit(1)
    const [change] = await db.select().from(orderChange).where(and(
      eq(orderChange.order_id, id),
      eq(orderChange.change_type, "draft_edit"),
      isNull(orderChange.canceled_at),
    )).limit(1)
    return { draft_order_preview: { order: ord, order_change: change } }
  },
}
