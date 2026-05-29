import { and, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  order,
  orderChange,
  orderCreditLine,
  orderItem,
  orderSummary,
  orderLineItem,
  orderShippingMethod,
  orderTransaction,
  payment,
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

    const where = and(...conditions)

    const [orders, [{ total }]] = await Promise.all([
      db
        .select()
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

  async getById(id: string, storeOnly = false, customerId?: string) {
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

    // Load nested relations (对齐 Medusa defaultAdminRetrieveOrderFields)
    const [items, summary, shippingMethods, paymentCollections] = await Promise.all([
      db.select().from(orderItem)
        .leftJoin(orderLineItem, eq(orderItem.item_id, orderLineItem.id))
        .where(eq(orderItem.order_id, id))
        .orderBy(desc(orderItem.version))
        .catch(() => []),
      db.select().from(orderSummary)
        .where(eq(orderSummary.order_id, id))
        .orderBy(desc(orderSummary.version))
        .limit(1).then((r) => r[0] ?? null)
        .catch(() => null),
      db.select().from(orderShippingMethod)
        .where(eq(orderShippingMethod.id, id))
        .catch(() => []),
      db.select().from(payment)
        .where(eq(payment.id, id))
        .catch(() => []),
    ])

    return {
      order: {
        ...item,
        items,
        summary,
        shipping_methods: shippingMethods,
        payment_collections: paymentCollections,
      },
    }
  },

  async create(input: CreateOrderInput) {
    const db = getDb()
    const id = generateId("order")

    const [created] = await db
      .insert(order)
      .values({
        id,
        region_id: input.region_id ?? null,
        customer_id: input.customer_id ?? null,
        sales_channel_id: input.sales_channel_id ?? null,
        email: input.email ?? null,
        currency_code: input.currency_code ?? "USD",
        metadata: input.metadata ?? null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning()

    return { order: created }
  },

  async update(id: string, input: UpdateOrderInput) {
    const db = getDb()
    await this.getById(id)

    const [updated] = await db
      .update(order)
      .set({
        ...(input.region_id !== undefined && { region_id: input.region_id }),
        ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
        ...(input.sales_channel_id !== undefined && { sales_channel_id: input.sales_channel_id }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.currency_code !== undefined && { currency_code: input.currency_code }),
        ...(input.locale !== undefined && { locale: input.locale }),
        ...(input.metadata !== undefined && { metadata: input.metadata }),
        updated_at: sql`now()`,
      })
      .where(and(eq(order.id, id), isNull(order.deleted_at)))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: "Order not found" })
    }

    return { order: updated }
  },

  async cancel(id: string) {
    const db = getDb()
    const [updated] = await db
      .update(order)
      .set({
        status: "canceled",
        canceled_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where(and(eq(order.id, id), isNull(order.deleted_at)))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: "Order not found" })
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

    return { order_changes: changes, count: Number(total) }
  },

  async getPreview(id: string) {
    const db = getDb()

    const [ord] = await db
      .select()
      .from(order)
      .where(and(eq(order.id, id), isNull(order.deleted_at)))
      .limit(1)

    if (!ord) {
      throw new HTTPException(404, { message: "Order not found" })
    }

    // Get items with line items
    const items = await db
      .select()
      .from(orderItem)
      .leftJoin(orderLineItem, eq(orderItem.item_id, orderLineItem.id))
      .where(eq(orderItem.order_id, id))
      .orderBy(desc(orderItem.version))

    // Get latest summary
    const [summary] = await db
      .select()
      .from(orderSummary)
      .where(eq(orderSummary.order_id, id))
      .orderBy(desc(orderSummary.version))
      .limit(1)

    // Get active changes
    const activeChanges = await db
      .select()
      .from(orderChange)
      .where(and(
        eq(orderChange.order_id, id),
        isNull(orderChange.confirmed_at),
        isNull(orderChange.canceled_at),
      ))

    return {
      order: ord,
      items,
      summary: summary ?? null,
      pending_changes: activeChanges,
    }
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

    // Create an order change with type "transfer"
    const changeId = generateId("ordch")
    await db
      .insert(orderChange)
      .values({
        id: changeId,
        order_id: orderId,
        version: (ord.version ?? 1) + 1,
        change_type: "transfer",
        description: input.description ?? `Transfer to customer ${input.customer_id}`,
        internal_note: input.internal_note ?? null,
        created_by: "admin",
      })

    // Store the target customer in metadata
    await db
      .update(order)
      .set({
        metadata: { ...(ord.metadata as Record<string, unknown> ?? {}), transfer_customer_id: input.customer_id },
        updated_at: sql`now()`,
      })
      .where(eq(order.id, orderId))

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
    const db = getDb()
    const lineItemId = generateId("olitm")
    const orderItemId = generateId("orditm")

    await db.insert(orderLineItem).values({
      id: lineItemId,
      title: "",
      variant_id: input.variant_id ?? null,
      product_id: null,
      requires_shipping: true,
      is_giftcard: false,
      is_discountable: true,
      is_tax_inclusive: false,
      unit_price: input.unit_price ? String(input.unit_price) : null,
      raw_unit_price: input.unit_price ? { amount: input.unit_price, precision: 2 } : null,
    })

    await db.insert(orderItem).values({
      id: orderItemId,
      order_id: orderId,
      item_id: lineItemId,
      quantity: String(input.quantity),
      raw_quantity: { amount: input.quantity, precision: 0 },
      unit_price: input.unit_price ? String(input.unit_price) : null,
      raw_unit_price: input.unit_price ? { amount: input.unit_price, precision: 2 } : null,
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
}
