import { and, count, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import {
  generateId,
  getDb,
  order,
  orderAddress,
  orderChange,
  orderChangeAction,
  orderCreditLine,
  orderItem,
  orderSummary,
  orderLineItem,
  orderShippingMethod,
  orderTransaction,
} from "@my-store/db"
import type {
  CreateOrderInput,
  ListOrdersQuery,
  UpdateOrderInput,
  CreateCreditLineInput,
  RequestTransferInput,
  ListOrderChangesQuery,
} from "@my-store/validators"
import { HTTPException } from "hono/http-exception"
import { sendOrderCanceledEmail } from "../lib/mail"
import { dispatchRollbackProcess } from "../lib/rollback"
import { runInTransaction } from "../lib/transaction"
import { notificationService } from "./notification.service"
import {
  DEFAULT_ADMIN_ORDER_RETRIEVE_FIELDS,
  presentAdminOrderDetail,
  presentAdminOrders,
} from "./order"
import { buildAdminOrderPreview } from "./order/admin-order-preview"
import { toCsv } from "../lib/csv"

const EXPORT_DIR = path.resolve(process.cwd(), "public/exports")
const ORDER_EXPORT_HEADERS = [
  "Order Id",
  "Display Id",
  "Email",
  "Status",
  "Currency",
  "Total",
  "Created At",
]

function parseStatusFilter(
  value: string | string[] | undefined,
): string[] | undefined {
  if (value == null || value === "") return undefined
  const parts = (Array.isArray(value) ? value : [value])
    .flatMap((v) => String(v).split(","))
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.length ? parts : undefined
}

export const orderService = {
  async list(query: ListOrdersQuery) {
    const db = getDb()
    const conditions: any[] = [
      isNull(order.deleted_at),
      eq(order.is_draft_order, false),
    ]

    if (query.status) conditions.push(eq(order.status, query.status))
    if (query.customer_id) conditions.push(eq(order.customer_id, query.customer_id))
    if (query.region_id) conditions.push(eq(order.region_id, query.region_id))
    if (query.sales_channel_id) conditions.push(eq(order.sales_channel_id, query.sales_channel_id))

    if (query.created_at) {
      if (query.created_at.$gte) conditions.push(sql`${order.created_at} >= ${query.created_at.$gte}::timestamp`)
      if (query.created_at.$lte) conditions.push(sql`${order.created_at} <= ${query.created_at.$lte}::timestamp`)
    }
    if (query.updated_at) {
      if (query.updated_at.$gte) conditions.push(sql`${order.updated_at} >= ${query.updated_at.$gte}::timestamp`)
      if (query.updated_at.$lte) conditions.push(sql`${order.updated_at} <= ${query.updated_at.$lte}::timestamp`)
    }

    if (query.q) {
      conditions.push(
        or(ilike(order.email, `%${query.q}%`))!
      )
    }

    const paymentFilters = parseStatusFilter(query.payment_status)
    const fulfillmentFilters = parseStatusFilter(query.fulfillment_status)
    const hasAggregateStatusFilter =
      (paymentFilters?.length ?? 0) > 0 ||
      (fulfillmentFilters?.length ?? 0) > 0

    const where = and(...conditions)

    const [orderRows, [{ total: dbTotal }]] = await Promise.all([
      db
        .select()
        .from(order)
        .where(where)
        .orderBy(desc(order.created_at))
        .limit(hasAggregateStatusFilter ? 10_000 : query.limit)
        .offset(hasAggregateStatusFilter ? 0 : query.offset),
      db.select({ total: count() }).from(order).where(where),
    ])

    let enriched = await presentAdminOrders(db as any, orderRows, {
      fields: query.fields,
    })

    if (paymentFilters?.length) {
      enriched = enriched.filter((o) =>
        paymentFilters.includes(
          (o as { payment_status?: string }).payment_status ?? "",
        ),
      )
    }
    if (fulfillmentFilters?.length) {
      enriched = enriched.filter((o) =>
        fulfillmentFilters.includes(
          (o as { fulfillment_status?: string }).fulfillment_status ?? "",
        ),
      )
    }

    if (hasAggregateStatusFilter) {
      const count = enriched.length
      const orders = enriched.slice(
        query.offset,
        query.offset + query.limit,
      )
      return {
        orders,
        count,
        limit: query.limit,
        offset: query.offset,
      }
    }

    return {
      orders: enriched,
      count: Number(dbTotal),
      limit: query.limit,
      offset: query.offset,
    }
  },

  async listStore(customerId: string, query: ListOrdersQuery) {
    const db = getDb()
    const conditions = [
      isNull(order.deleted_at),
      eq(order.customer_id, customerId),
    ]

    if (query.status) {
      conditions.push(eq(order.status, query.status))
    }

    const where = and(...conditions)

    const [orders, [{ total }]] = await Promise.all([
      db
        .select({
          id: order.id,
          display_id: order.display_id,
          status: order.status,
          email: order.email,
          currency_code: order.currency_code,
          created_at: order.created_at,
        })
        .from(order)
        .where(where)
        .orderBy(desc(order.created_at))
        .limit(query.limit)
        .offset(query.offset),
      db.select({ total: count() }).from(order).where(where),
    ])

    return {
      orders,
      count: Number(total),
      limit: query.limit,
      offset: query.offset,
    }
  },

  async getById(id: string, storeOnly = false, customerId?: string, fields?: string) {
    const db = getDb()
    const conditions = [eq(order.id, id), isNull(order.deleted_at)]

    if (storeOnly && customerId) {
      conditions.push(eq(order.customer_id, customerId))
    }

    const [item] = await db
      .select()
      .from(order)
      .where(and(...conditions))
      .limit(1)

    if (!item) {
      throw new HTTPException(404, { message: "Order not found" })
    }

    return {
      order: await presentAdminOrderDetail(
        db as any,
        item,
        fields ?? DEFAULT_ADMIN_ORDER_RETRIEVE_FIELDS,
      ),
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

      const [row] = await tx
        .insert(order)
        .values({
          id,
          region_id: input.region_id ?? null,
          customer_id: input.customer_id ?? null,
          sales_channel_id: input.sales_channel_id ?? null,
          email: input.email ?? null,
          currency_code: input.currency_code ?? "USD",
          shipping_address_id: shippingAddrId,
          billing_address_id: billingAddrId,
          metadata: input.metadata ?? null,
          created_at: sql`now()`,
          updated_at: sql`now()`,
        })
        .returning()

      return row
    })

    return { order: created }
  },

  async addNote(orderId: string, value: string) {
    const { order: ord } = await this.getById(orderId)
    const meta = {
      ...(((ord as { metadata?: unknown }).metadata as Record<string, unknown>) ??
        {}),
    }
    const notes = Array.isArray(meta.admin_notes)
      ? [...(meta.admin_notes as object[])]
      : []
    notes.push({
      id: generateId("note"),
      value,
      created_at: new Date().toISOString(),
      created_by: "admin",
    })
    meta.admin_notes = notes
    return this.update(orderId, { metadata: meta })
  },

  async update(id: string, input: UpdateOrderInput) {
    const db = getDb()
    await this.getById(id)

    let shippingAddrId: string | null | undefined
    let billingAddrId: string | null | undefined
    const createdAddrIds: string[] = []

    await dispatchRollbackProcess(
      async () => {
        if (input.shipping_address !== undefined) {
          if (input.shipping_address === null) {
            shippingAddrId = null
          } else {
            const addrId = generateId("ordaddr")
            await db.insert(orderAddress).values({ id: addrId, ...input.shipping_address, metadata: input.shipping_address.metadata ?? null })
            createdAddrIds.push(addrId)
            shippingAddrId = addrId
          }
        }
        if (input.billing_address !== undefined) {
          if (input.billing_address === null) {
            billingAddrId = null
          } else {
            const addrId = generateId("ordaddr")
            await db.insert(orderAddress).values({ id: addrId, ...input.billing_address, metadata: input.billing_address.metadata ?? null })
            createdAddrIds.push(addrId)
            billingAddrId = addrId
          }
        }
        const setData: Record<string, any> = { updated_at: sql`now()` }
        if (input.region_id !== undefined) setData.region_id = input.region_id
        if (input.customer_id !== undefined) setData.customer_id = input.customer_id
        if (input.sales_channel_id !== undefined) setData.sales_channel_id = input.sales_channel_id
        if (input.email !== undefined) setData.email = input.email
        if (input.currency_code !== undefined) setData.currency_code = input.currency_code
        if (input.locale !== undefined) setData.locale = input.locale
        if (input.metadata !== undefined) setData.metadata = input.metadata
        if (shippingAddrId !== undefined) setData.shipping_address_id = shippingAddrId
        if (billingAddrId !== undefined) setData.billing_address_id = billingAddrId

        const [updated] = await db.update(order).set(setData).where(and(eq(order.id, id), isNull(order.deleted_at))).returning()
        if (!updated) throw new HTTPException(404, { message: "Order not found" })
        return { order: updated }
      },
      async () => {
        for (const aid of createdAddrIds) {
          try { await db.delete(orderAddress).where(eq(orderAddress.id, aid)) } catch {}
        }
      },
    )

    return this.getById(id)
  },

  async cancel(id: string) {
    const updated = await runInTransaction(async (tx) => {
      const [row] = await tx
        .update(order)
        .set({
          status: "canceled",
          canceled_at: sql`now()`,
          updated_at: sql`now()`,
        })
        .where(and(eq(order.id, id), isNull(order.deleted_at)))
        .returning()

      if (!row) {
        throw new HTTPException(404, { message: "Order not found" })
      }
      return row
    })

    // Send cancellation email (fire-and-forget)
    if (!updated.no_notification && updated.email) {
      const displayId = String(updated.display_id ?? id)
      notificationService.send({
        to: updated.email,
        template: "order.canceled",
        data: { display_id: displayId, order_id: id },
        trigger_type: "order.canceled",
        resource_id: id,
        resource_type: "order",
        idempotency_key: `order-cancel-${id}`,
        no_notification: updated.no_notification,
        sender: () => sendOrderCanceledEmail(updated.email!, displayId, id),
      })
    }

    return { order: updated }
  },

  async archive(id: string) {
    const db = getDb()
    const [updated] = await db
      .update(order)
      .set({
        status: "archived",
        updated_at: sql`now()`,
      })
      .where(and(eq(order.id, id), isNull(order.deleted_at)))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: "Order not found" })
    }

    return { order: updated }
  },

  async complete(id: string) {
    const db = getDb()
    const [updated] = await db
      .update(order)
      .set({
        status: "completed",
        updated_at: sql`now()`,
      })
      .where(and(eq(order.id, id), isNull(order.deleted_at)))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: "Order not found" })
    }

    return { order: updated }
  },

  // ── Order Changes ─────────────────────────────────────

  async getChanges(id: string, query: ListOrderChangesQuery = { limit: 50, offset: 0 }) {
    const db = getDb()
    const conditions = [eq(orderChange.order_id, id)]

    if (query.status) {
      conditions.push(eq(orderChange.change_type, query.status))
    }

    const [changes, [{ total }]] = await Promise.all([
      db
        .select()
        .from(orderChange)
        .where(and(...conditions))
        .orderBy(desc(orderChange.created_at))
        .limit(query.limit)
        .offset(query.offset),
      db.select({ total: count() }).from(orderChange).where(and(...conditions)),
    ])

    // Load actions for each change
    const changesWithActions = await Promise.all(
      changes.map(async (change) => {
        const actions = await db
          .select()
          .from(orderChangeAction)
          .where(eq(orderChangeAction.order_change_id, change.id))
          .orderBy(orderChangeAction.ordering)
        return { ...change, actions }
      })
    )

    return { order_changes: changesWithActions, count: Number(total) }
  },

  async getPreview(id: string) {
    return buildAdminOrderPreview(id)
  },

  // ── Credit Lines ──────────────────────────────────────

  async createCreditLine(orderId: string, input: CreateCreditLineInput) {
    const db = getDb()
    const id = generateId("crdt")

    const [created] = await db
      .insert(orderCreditLine)
      .values({
        id,
        order_id: orderId,
        amount: String(input.amount),
        raw_amount: { amount: input.amount, precision: 2 },
        reference: input.reference ?? null,
        reference_id: input.reference_id ?? null,
        metadata: input.metadata ?? null,
      })
      .returning()

    return { order_credit_line: created }
  },

  // ── Order Transfer ────────────────────────────────────

  async requestTransfer(orderId: string, input: RequestTransferInput) {
    const db = getDb()
    const [ord] = await db
      .select()
      .from(order)
      .where(and(eq(order.id, orderId), isNull(order.deleted_at)))
      .limit(1)

    if (!ord) {
      throw new HTTPException(404, { message: "Order not found" })
    }

    const changeId = generateId("ordch")
    await dispatchRollbackProcess(
      async () => {
        await db.insert(orderChange).values({
          id: changeId,
          order_id: orderId,
          version: (ord.version ?? 1) + 1,
          change_type: "transfer",
          description:
            input.description ??
            `Transfer to customer ${input.customer_id}`,
          internal_note: input.internal_note ?? null,
          created_by: "admin",
        })

        const [updated] = await db
          .update(order)
          .set({
            metadata: {
              ...((ord.metadata as Record<string, unknown>) ?? {}),
              transfer_customer_id: input.customer_id,
            },
            updated_at: sql`now()`,
          })
          .where(eq(order.id, orderId))
          .returning()

        if (!updated) {
          throw new HTTPException(404, { message: "Order not found" })
        }
      },
      async () => {
        await db.delete(orderChange).where(eq(orderChange.id, changeId))
      },
    )

    return this.getById(orderId)
  },

  async cancelTransfer(orderId: string) {
    const db = getDb()

    const [activeChange] = await db
      .select()
      .from(orderChange)
      .where(and(
        eq(orderChange.order_id, orderId),
        eq(orderChange.change_type, "transfer"),
        isNull(orderChange.canceled_at),
        isNull(orderChange.confirmed_at),
      ))
      .limit(1)

    if (!activeChange) {
      throw new HTTPException(404, { message: "No active transfer request found" })
    }

    await db
      .update(orderChange)
      .set({
        canceled_at: sql`now()`,
        canceled_by: "admin",
      })
      .where(eq(orderChange.id, activeChange.id))

    // Clear transfer metadata
    const [ord] = await db
      .select()
      .from(order)
      .where(eq(order.id, orderId))
      .limit(1)

    if (ord) {
      const meta = { ...(ord.metadata as Record<string, unknown> ?? {}) }
      delete meta.transfer_customer_id
      await db
        .update(order)
        .set({ metadata: meta, updated_at: sql`now()` })
        .where(eq(order.id, orderId))
    }

    return this.getById(orderId)
  },

  // ── Store-Side Transfer ──────────────────────────────

  async storeRequestTransfer(orderId: string, customerId: string, input?: { note?: string }) {
    const db = getDb()
    const [ord] = await db
      .select()
      .from(order)
      .where(and(eq(order.id, orderId), eq(order.customer_id, customerId), isNull(order.deleted_at)))
      .limit(1)

    if (!ord) {
      throw new HTTPException(404, { message: "Order not found or not owned by you" })
    }

    const changeId = generateId("ordch")
    const [change] = await db
      .insert(orderChange)
      .values({
        id: changeId,
        order_id: orderId,
        version: (ord.version ?? 1) + 1,
        change_type: "transfer",
        description: input?.note ?? "Transfer requested by customer",
        requested_by: customerId,
        created_by: customerId,
      })
      .returning()

    return { order_change: change }
  },

  async storeAcceptTransfer(orderId: string, customerId: string) {
    const db = getDb()

    const [activeChange] = await db
      .select()
      .from(orderChange)
      .where(and(
        eq(orderChange.order_id, orderId),
        eq(orderChange.change_type, "transfer"),
        isNull(orderChange.canceled_at),
        isNull(orderChange.confirmed_at),
      ))
      .limit(1)

    if (!activeChange) {
      throw new HTTPException(404, { message: "No active transfer request found" })
    }

    const [updated] = await db
      .update(orderChange)
      .set({
        confirmed_at: sql`now()`,
        confirmed_by: customerId,
      })
      .where(eq(orderChange.id, activeChange.id))
      .returning()

    // Update order customer_id
    const [ord] = await db
      .select()
      .from(order)
      .where(eq(order.id, orderId))
      .limit(1)

    if (ord) {
      const meta = ord.metadata as Record<string, unknown> ?? {}
      const targetCustomerId = meta.transfer_customer_id as string
      if (targetCustomerId) {
        await db
          .update(order)
          .set({ customer_id: targetCustomerId, updated_at: sql`now()` })
          .where(eq(order.id, orderId))
      }
    }

    return { order_change: updated }
  },

  async storeDeclineTransfer(orderId: string, customerId: string) {
    const db = getDb()

    const [activeChange] = await db
      .select()
      .from(orderChange)
      .where(and(
        eq(orderChange.order_id, orderId),
        eq(orderChange.change_type, "transfer"),
        isNull(orderChange.canceled_at),
        isNull(orderChange.confirmed_at),
      ))
      .limit(1)

    if (!activeChange) {
      throw new HTTPException(404, { message: "No active transfer request found" })
    }

    const [declined] = await db
      .update(orderChange)
      .set({
        declined_at: sql`now()`,
        declined_by: customerId,
        declined_reason: "Declined by recipient",
      })
      .where(eq(orderChange.id, activeChange.id))
      .returning()

    return { order_change: declined }
  },

  async storeCancelTransfer(orderId: string, customerId: string) {
    const db = getDb()

    const [activeChange] = await db
      .select()
      .from(orderChange)
      .where(and(
        eq(orderChange.order_id, orderId),
        eq(orderChange.change_type, "transfer"),
        isNull(orderChange.canceled_at),
        isNull(orderChange.confirmed_at),
        eq(orderChange.created_by, customerId),
      ))
      .limit(1)

    if (!activeChange) {
      throw new HTTPException(404, { message: "No active transfer request found" })
    }

    const [canceled] = await db
      .update(orderChange)
      .set({
        canceled_at: sql`now()`,
        canceled_by: customerId,
      })
      .where(eq(orderChange.id, activeChange.id))
      .returning()

    return { order_change: canceled }
  },

  // ── Line Items ────────────────────────────────────────

  async listLineItems(orderId: string) {
    const db = getDb()
    const items = await db
      .select()
      .from(orderLineItem)
      .innerJoin(orderItem, eq(orderLineItem.id, orderItem.item_id))
      .where(eq(orderItem.order_id, orderId))
      .orderBy(desc(orderLineItem.created_at))

    return { line_items: items }
  },

  async addLineItem(orderId: string, input: import("@my-store/validators").AddLineItemToOrderInput) {
    const lineItemId = generateId("olitm")
    const orderItemId = generateId("orditm")

    await runInTransaction(async (tx) => {
      await tx.insert(orderLineItem).values({
        id: lineItemId,
        title: "",
        variant_id: input.variant_id ?? null,
        product_id: null,
        requires_shipping: true,
        is_giftcard: false,
        is_discountable: true,
        is_tax_inclusive: false,
        unit_price: input.unit_price ? String(input.unit_price) : null,
        raw_unit_price: input.unit_price
          ? { amount: input.unit_price, precision: 2 }
          : null,
      })

      await tx.insert(orderItem).values({
        id: orderItemId,
        version: 1,
        order_id: orderId,
        item_id: lineItemId,
        quantity: String(input.quantity),
        raw_quantity: { amount: input.quantity, precision: 0 },
        unit_price: input.unit_price ? String(input.unit_price) : null,
        raw_unit_price: input.unit_price
          ? { amount: input.unit_price, precision: 2 }
          : null,
        fulfilled_quantity: "0",
        shipped_quantity: "0",
        delivered_quantity: "0",
        return_requested_quantity: "0",
        return_received_quantity: "0",
        return_dismissed_quantity: "0",
        written_off_quantity: "0",
      })
    })

    return { line_item: { id: lineItemId, order_item_id: orderItemId } }
  },

  // ── Shipping Options ──────────────────────────────────
  async listShippingOptions(_orderId: string) {
    return { shipping_options: [] }
  },

  // ── Order Change Update ─────────────────────────────

  async updateOrderChange(changeId: string, payload: { carry_over_promotions?: boolean }) {
    const db = getDb()
    const [updated] = await db.update(orderChange).set({
      carry_over_promotions: payload.carry_over_promotions ?? null,
    }).where(eq(orderChange.id, changeId)).returning()
    if (!updated) throw new HTTPException(404, { message: "Order change not found" })
    return { order_change: updated }
  },

  async createChange(orderId: string) {
    const db = getDb()
    const [ord] = await db.select().from(order).where(and(eq(order.id, orderId), isNull(order.deleted_at))).limit(1)
    if (!ord) throw new HTTPException(404, { message: "Order not found" })

    const [change] = await db.insert(orderChange).values({
      id: generateId("ordch"),
      order_id: orderId,
      version: (ord.version ?? 1) + 1,
      change_type: "edit",
      created_by: "admin",
    }).returning()
    return { order_change: change }
  },

  async addShippingMethod(orderId: string, input: import("@my-store/validators").AddShippingMethodToOrderInput) {
    const db = getDb()
    const [ord] = await db.select().from(order).where(and(eq(order.id, orderId), isNull(order.deleted_at))).limit(1)
    if (!ord) throw new HTTPException(404, { message: "Order not found" })

    const meta = (ord.metadata as Record<string, any>) ?? {}
    const shippingMethods = meta.shipping_methods ?? []
    shippingMethods.push({ ...input, id: generateId("shpm") })
    meta.shipping_methods = shippingMethods
    await db.update(order).set({ metadata: meta, updated_at: sql`now()` }).where(eq(order.id, orderId))

    return { order: { id: orderId, metadata: meta } }
  },

  async deleteOrder(id: string) {
    const db = getDb()
    await db.update(order).set({ deleted_at: sql`now()`, updated_at: sql`now()` })
      .where(and(eq(order.id, id), isNull(order.deleted_at)))
    return { id, object: "order", deleted: true }
  },

  async listTransactions(orderId: string) {
    const db = getDb()
    const transactions = await db.select().from(orderTransaction)
      .where(eq(orderTransaction.order_id, orderId))
      .orderBy(desc(orderTransaction.version))
    return { transactions }
  },

  async removeShippingMethod(orderId: string, methodId: string) {
    const db = getDb()
    const [ord] = await db.select().from(order).where(and(eq(order.id, orderId), isNull(order.deleted_at))).limit(1)
    if (!ord) throw new HTTPException(404, { message: "Order not found" })

    const meta = (ord.metadata as Record<string, any>) ?? {}
    meta.shipping_methods = (meta.shipping_methods ?? []).filter((s: any) => s.id !== methodId)
    await db.update(order).set({ metadata: meta, updated_at: sql`now()` }).where(eq(order.id, orderId))
    return { order: { id: orderId, metadata: meta } }
  },

  async exportOrders(options?: { page_size?: number }) {
    const db = getDb()
    const pageSize = Math.min(Math.max(options?.page_size ?? 500, 50), 1000)
    const transactionId = generateId("oexp")
    const filename = `${transactionId}.csv`
    const csvRows: string[][] = []

    let offset = 0
    for (;;) {
      const batch = await db
        .select()
        .from(order)
        .where(and(isNull(order.deleted_at), eq(order.is_draft_order, false)))
        .orderBy(desc(order.created_at))
        .limit(pageSize)
        .offset(offset)

      if (batch.length === 0) break

      const orderIds = batch.map((r) => r.id)
      const summaries =
        orderIds.length > 0
          ? await db
              .select()
              .from(orderSummary)
              .where(inArray(orderSummary.order_id, orderIds))
          : []
      const summaryByOrder = new Map(summaries.map((s) => [s.order_id, s]))

      for (const o of batch) {
        const sum = summaryByOrder.get(o.id)
        const totals = (sum?.totals as Record<string, unknown> | null | undefined) ?? {}
        const total = totals.total ?? totals.grand_total ?? totals.original_total ?? ""
        csvRows.push([
          o.id,
          String(o.display_id ?? ""),
          o.email ?? "",
          o.status ?? "",
          o.currency_code ?? "",
          String(total),
          o.created_at
            ? new Date(o.created_at as string | Date).toISOString()
            : "",
        ])
      }

      offset += batch.length
      if (batch.length < pageSize) break
    }

    await mkdir(EXPORT_DIR, { recursive: true })
    await writeFile(
      path.join(EXPORT_DIR, filename),
      toCsv(ORDER_EXPORT_HEADERS, csvRows),
      "utf-8",
    )

    return {
      transaction_id: transactionId,
      url: `/exports/${filename}`,
      count: csvRows.length,
      page_size: pageSize,
    }
  },
}
