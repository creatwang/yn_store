import { and, asc, desc, eq, isNull, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  order,
  orderAddress,
  orderChange,
  orderChangeAction,
  orderItem,
  orderLineItem,
  orderPromotion,
  orderShippingMethod,
  promotion,
} from "@my-store/db"
import type {
  AdminAddDraftOrderPromotionsType,
  AdminCreateDraftOrderType,
  AdminGetDraftOrdersParamsType,
  AdminRemoveDraftOrderPromotionsType,
  AdminUpdateDraftOrderType,
} from "@my-store/validators/medusa/admin/draft-orders/validators"
import { HTTPException } from "hono/http-exception"
import {
  applyDateRangeConditions,
  applyInArrayCondition,
  asDateRange,
  listLimitOffset,
} from "../lib/infra/query/query-filters"
import { runInTransaction } from "../lib/infra/db/transaction"
import { variantService } from "./variant.service"
import {
  presentAdminOrderDetail,
  presentAdminOrders,
} from "./order/admin-order"
import { buildDraftOrderEditPreview } from "./order/draft-order-edit-preview"
import { insertOrderLineItemPair } from "./order/order-line-item-write"
import {
  DEFAULT_ADMIN_DRAFT_ORDER_LIST_FIELDS,
  DEFAULT_ADMIN_DRAFT_ORDER_RETRIEVE_FIELDS,
} from "./order/draft-order-fields"

type Db = ReturnType<typeof getDb>

async function requireDraftOrder(db: Db, id: string) {
  const [row] = await db
    .select()
    .from(order)
    .where(
      and(
        eq(order.id, id),
        eq(order.is_draft_order, true),
        isNull(order.deleted_at),
      ),
    )
    .limit(1)
  if (!row) {
    throw new HTTPException(404, { message: "Draft order not found" })
  }
  return row
}

async function getActiveEdit(db: Db, orderId: string) {
  const [change] = await db
    .select()
    .from(orderChange)
    .where(
      and(
        eq(orderChange.order_id, orderId),
        eq(orderChange.change_type, "draft_edit"),
        isNull(orderChange.canceled_at),
        isNull(orderChange.confirmed_at),
      ),
    )
    .limit(1)
  return change ?? null
}

async function ensureEdit(db: Db, orderId: string) {
  let change = await getActiveEdit(db, orderId)
  if (change) return change

  const ord = await requireDraftOrder(db, orderId)
  const changeId = generateId("ordch")
  const [created] = await db
    .insert(orderChange)
    .values({
      id: changeId,
      order_id: orderId,
      version: (ord.version ?? 1) + 1,
      change_type: "draft_edit",
      status: "pending",
      created_by: "admin",
      metadata: {},
    })
    .returning()
  return created
}

async function nextOrdering(db: Db, changeId: string) {
  const rows = await db
    .select({ ordering: orderChangeAction.ordering })
    .from(orderChangeAction)
    .where(eq(orderChangeAction.order_change_id, changeId))
    .orderBy(desc(orderChangeAction.ordering))
    .limit(1)
  return (rows[0]?.ordering ?? 0) + 1
}

async function insertAction(
  db: Db,
  params: {
    orderId: string
    changeId: string
    version: number
    action: string
    reference?: string
    referenceId?: string
    details?: Record<string, unknown>
    amount?: number | null
  },
) {
  const id = generateId("ordchact")
  await db.insert(orderChangeAction).values({
    id,
    order_id: params.orderId,
    order_change_id: params.changeId,
    action: params.action,
    reference: params.reference ?? null,
    reference_id: params.referenceId ?? null,
    details: params.details ?? {},
    amount: params.amount != null ? String(params.amount) : null,
    ordering: await nextOrdering(db, params.changeId),
    version: params.version,
  })
  return id
}

async function linkShippingToOrder(
  db: Db,
  orderId: string,
  methodId: string,
  version: number,
) {
  const linkId = generateId("ordsp")
  await db.execute(sql`
    INSERT INTO order_shipping (id, order_id, shipping_method_id, version, created_at, updated_at)
    VALUES (${linkId}, ${orderId}, ${methodId}, ${version}, now(), now())
  `)
}

export const draftOrderService = {
  async list(query: AdminGetDraftOrdersParamsType) {
    const db = getDb()
    const conditions: Parameters<typeof and>[0][] = [
      isNull(order.deleted_at),
      eq(order.is_draft_order, true),
    ]

    applyInArrayCondition(
      order.id,
      query.id as string | string[] | undefined,
      conditions,
    )
    applyInArrayCondition(
      order.region_id,
      query.region_id as string | string[] | undefined,
      conditions,
    )
    applyInArrayCondition(
      order.sales_channel_id,
      query.sales_channel_id as string | string[] | undefined,
      conditions,
    )
    applyInArrayCondition(
      order.customer_id,
      query.customer_id as string | string[] | undefined,
      conditions,
    )

    if (query.q) {
      conditions.push(sql`${order.email} ILIKE ${`%${query.q}%`}`)
    }

    applyDateRangeConditions(
      order.created_at,
      asDateRange(query.created_at),
      conditions,
      sql,
    )
    applyDateRangeConditions(
      order.updated_at,
      asDateRange(query.updated_at),
      conditions,
      sql,
    )

    const { limit, offset } = listLimitOffset(query, { limit: 50, offset: 0 })

    const orders = await db
      .select()
      .from(order)
      .where(and(...conditions))
      .orderBy(desc(order.created_at))
      .limit(limit)
      .offset(offset)

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(order)
      .where(and(...conditions))

    const fields =
      typeof query.fields === "string"
        ? query.fields
        : DEFAULT_ADMIN_DRAFT_ORDER_LIST_FIELDS

    const draft_orders = await presentAdminOrders(db, orders, { fields })

    return {
      draft_orders,
      count: Number(total),
      limit,
      offset,
    }
  },

  async getById(id: string, fields?: string) {
    const db = getDb()
    const ord = await requireDraftOrder(db, id)
    const draft_order = await presentAdminOrderDetail(
      db,
      ord,
      fields ?? DEFAULT_ADMIN_DRAFT_ORDER_RETRIEVE_FIELDS,
    )
    return { draft_order }
  },

  async create(input: AdminCreateDraftOrderType) {
    const id = generateId("order")

    const created = await runInTransaction(async (tx) => {
      let shippingAddrId: string | null = null
      let billingAddrId: string | null = null

      const shipAddr = input.shipping_address
      if (shipAddr && typeof shipAddr === "object") {
        shippingAddrId = generateId("ordaddr")
        await tx.insert(orderAddress).values({
          id: shippingAddrId,
          ...shipAddr,
          metadata: shipAddr.metadata ?? null,
        })
      }

      const billAddr = input.billing_address
      if (billAddr && typeof billAddr === "object") {
        billingAddrId = generateId("ordaddr")
        await tx.insert(orderAddress).values({
          id: billingAddrId,
          ...billAddr,
          metadata: billAddr.metadata ?? null,
        })
      }

      const [row] = await tx
        .insert(order)
        .values({
          id,
          region_id: input.region_id,
          customer_id: input.customer_id ?? null,
          sales_channel_id: input.sales_channel_id ?? null,
          email: input.email ?? null,
          currency_code: input.currency_code ?? "usd",
          status: "draft",
          is_draft_order: true,
          shipping_address_id: shippingAddrId,
          billing_address_id: billingAddrId,
          metadata: input.metadata ?? null,
          locale: input.locale ?? null,
          created_at: sql`now()`,
          updated_at: sql`now()`,
        })
        .returning()

      for (const item of input.items ?? []) {
        await insertOrderLineItemPair(tx, id, {
          variant_id: item.variant_id ?? undefined,
          title: item.title,
          quantity: item.quantity,
          unit_price:
            item.unit_price != null ? Number(item.unit_price) : undefined,
          metadata: item.metadata ?? null,
        })
      }

      return row
    })

    return this.getById(created.id)
  },

  async update(id: string, input: AdminUpdateDraftOrderType) {
    const db = getDb()
    await requireDraftOrder(db, id)

    const [updated] = await db
      .update(order)
      .set({
        ...(input.customer_id !== undefined && {
          customer_id: input.customer_id,
        }),
        ...(input.sales_channel_id !== undefined && {
          sales_channel_id: input.sales_channel_id,
        }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.metadata !== undefined && { metadata: input.metadata }),
        ...(input.locale !== undefined && { locale: input.locale }),
        updated_at: sql`now()`,
      })
      .where(
        and(
          eq(order.id, id),
          eq(order.is_draft_order, true),
          isNull(order.deleted_at),
        ),
      )
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: "Draft order not found" })
    }

    return this.getById(id)
  },

  async delete(id: string) {
    const db = getDb()
    await db
      .update(order)
      .set({ deleted_at: sql`now()` })
      .where(and(eq(order.id, id), eq(order.is_draft_order, true)))
    return { id, object: "draft-order", deleted: true }
  },

  async convertToOrder(id: string) {
    const db = getDb()
    const [updated] = await db
      .update(order)
      .set({
        is_draft_order: false,
        status: "pending",
        updated_at: sql`now()`,
      })
      .where(
        and(
          eq(order.id, id),
          eq(order.is_draft_order, true),
          isNull(order.deleted_at),
        ),
      )
      .returning()
    if (!updated) {
      throw new HTTPException(404, { message: "Draft order not found" })
    }
    return { order: updated }
  },

  async beginEdit(id: string) {
    const db = getDb()
    await requireDraftOrder(db, id)
    await ensureEdit(db, id)
    return buildDraftOrderEditPreview(id)
  },

  async cancelEdit(id: string) {
    const db = getDb()
    const active = await getActiveEdit(db, id)

    if (active) {
      await db
        .update(orderChange)
        .set({ canceled_at: sql`now()`, canceled_by: "admin" })
        .where(eq(orderChange.id, active.id))
    }

    return { id, object: "draft-order-edit", deleted: true }
  },

  async requestEdit(id: string) {
    const db = getDb()
    const active = await getActiveEdit(db, id)
    if (!active) {
      throw new HTTPException(400, { message: "No active draft order edit" })
    }

    await db
      .update(orderChange)
      .set({
        requested_at: sql`now()`,
        requested_by: "admin",
        status: "requested",
      })
      .where(eq(orderChange.id, active.id))

    return buildDraftOrderEditPreview(id)
  },

  async confirmEdit(id: string) {
    const db = getDb()
    const ord = await requireDraftOrder(db, id)
    const active = await getActiveEdit(db, id)
    if (!active) {
      throw new HTTPException(400, { message: "No draft order edit to confirm" })
    }

    const actions = await db
      .select()
      .from(orderChangeAction)
      .where(eq(orderChangeAction.order_change_id, active.id))
      .orderBy(asc(orderChangeAction.ordering))

    for (const act of actions) {
      const details = (act.details ?? {}) as Record<string, unknown>
      const code = details.code as string | undefined

      if (act.action === "PROMOTION_ADD" && code) {
        const [promo] = await db
          .select()
          .from(promotion)
          .where(
            and(eq(promotion.code, code), isNull(promotion.deleted_at)),
          )
          .limit(1)
        if (promo) {
          const existing = await db
            .select()
            .from(orderPromotion)
            .where(
              and(
                eq(orderPromotion.order_id, id),
                eq(orderPromotion.promotion_id, promo.id),
                isNull(orderPromotion.deleted_at),
              ),
            )
            .limit(1)
          if (!existing.length) {
            await db.insert(orderPromotion).values({
              id: generateId("ordprom"),
              order_id: id,
              promotion_id: promo.id,
            })
          }
        }
      }

      if (act.action === "PROMOTION_REMOVE" && code) {
        const [promo] = await db
          .select()
          .from(promotion)
          .where(eq(promotion.code, code))
          .limit(1)
        if (promo) {
          await db
            .update(orderPromotion)
            .set({ deleted_at: sql`now()` })
            .where(
              and(
                eq(orderPromotion.order_id, id),
                eq(orderPromotion.promotion_id, promo.id),
              ),
            )
        }
      }
    }

    await db
      .update(orderChange)
      .set({
        confirmed_at: sql`now()`,
        confirmed_by: "admin",
        status: "confirmed",
      })
      .where(eq(orderChange.id, active.id))

    await db
      .update(order)
      .set({ version: (ord.version ?? 1) + 1, updated_at: sql`now()` })
      .where(eq(order.id, id))

    return buildDraftOrderEditPreview(id)
  },

  async addItems(
    id: string,
    items: {
      variant_id?: string
      title?: string
      quantity: number
      unit_price?: number | null
      compare_at_unit_price?: number | null
      internal_note?: string | null
      allow_backorder?: boolean
      metadata?: Record<string, unknown>
    }[],
  ) {
    const db = getDb()
    await requireDraftOrder(db, id)
    const change = await ensureEdit(db, id)

    for (const item of items) {
      const lineItemId = generateId("olitm")
      const orderItemId = generateId("orditm")

      let lineTitle = item.title?.trim() ?? ""
      let productId: string | null = null

      if (item.variant_id) {
        try {
          const variant = await variantService.getVariantById(item.variant_id)
          if (!lineTitle) lineTitle = variant.title
          productId = variant.product_id ?? null
        } catch {
          /* variant missing — still persist id */
        }
      }

      const resolvedUnitPrice =
        item.unit_price != null && Number.isFinite(Number(item.unit_price))
          ? Number(item.unit_price)
          : 0
      const rawUnitPrice = { amount: resolvedUnitPrice, precision: 2 }

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
        metadata: item.metadata ?? null,
      })

      await db.insert(orderItem).values({
        id: orderItemId,
        version: 1,
        order_id: id,
        item_id: lineItemId,
        quantity: String(item.quantity),
        raw_quantity: { amount: item.quantity, precision: 0 },
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

      await insertAction(db, {
        orderId: id,
        changeId: change.id,
        version: change.version,
        action: "ITEM_ADD",
        reference: "order_line_item",
        referenceId: lineItemId,
        details: {
          order_item_id: orderItemId,
          quantity: item.quantity,
          unit_price: resolvedUnitPrice,
          variant_id: item.variant_id,
          title: lineTitle,
        },
      })
    }

    await db
      .update(order)
      .set({ updated_at: sql`now()` })
      .where(eq(order.id, id))

    return buildDraftOrderEditPreview(id)
  },

  async updateItem(
    id: string,
    itemId: string,
    data: {
      quantity: number
      unit_price?: number | null
      compare_at_unit_price?: number | null
      internal_note?: string
      metadata?: Record<string, unknown> | null
    },
  ) {
    const db = getDb()
    const change = await ensureEdit(db, id)

    const [oi] = await db
      .select()
      .from(orderItem)
      .where(and(eq(orderItem.id, itemId), eq(orderItem.order_id, id)))
      .limit(1)
    if (!oi) {
      throw new HTTPException(404, { message: "Order item not found" })
    }

    const unitPrice =
      data.unit_price != null ? String(data.unit_price) : oi.unit_price
    const rawUnitPrice =
      data.unit_price != null
        ? { amount: Number(data.unit_price), precision: 2 }
        : oi.raw_unit_price

    await db
      .update(orderItem)
      .set({
        quantity: String(data.quantity),
        raw_quantity: { amount: data.quantity, precision: 0 },
        ...(data.unit_price != null && {
          unit_price: unitPrice,
          raw_unit_price: rawUnitPrice,
        }),
      })
      .where(eq(orderItem.id, itemId))

    await insertAction(db, {
      orderId: id,
      changeId: change.id,
      version: change.version,
      action: "ITEM_UPDATE",
      reference: "order_item",
      referenceId: itemId,
      details: { quantity: data.quantity, unit_price: data.unit_price },
    })

    return buildDraftOrderEditPreview(id)
  },

  async updateItemAction(
    id: string,
    actionId: string,
    data: {
      quantity: number
      unit_price?: number | null
      compare_at_unit_price?: number | null
      internal_note?: string
    },
  ) {
    const db = getDb()
    await ensureEdit(db, id)

    const [act] = await db
      .select()
      .from(orderChangeAction)
      .where(
        and(
          eq(orderChangeAction.id, actionId),
          eq(orderChangeAction.order_id, id),
        ),
      )
      .limit(1)
    if (!act) {
      throw new HTTPException(404, { message: "Edit action not found" })
    }

    const details = {
      ...((act.details ?? {}) as Record<string, unknown>),
      quantity: data.quantity,
      ...(data.unit_price != null && { unit_price: data.unit_price }),
    }

    await db
      .update(orderChangeAction)
      .set({ details })
      .where(eq(orderChangeAction.id, actionId))

    const lineItemId = act.reference_id ?? undefined
    if (lineItemId) {
      await db
        .update(orderItem)
        .set({
          quantity: String(data.quantity),
          raw_quantity: { amount: data.quantity, precision: 0 },
          ...(data.unit_price != null && {
            unit_price: String(data.unit_price),
            raw_unit_price: { amount: data.unit_price, precision: 2 },
          }),
        })
        .where(
          and(eq(orderItem.item_id, lineItemId), eq(orderItem.order_id, id)),
        )
    }

    return buildDraftOrderEditPreview(id)
  },

  async removeItemAction(id: string, actionId: string) {
    const db = getDb()
    await ensureEdit(db, id)

    const [act] = await db
      .select()
      .from(orderChangeAction)
      .where(
        and(
          eq(orderChangeAction.id, actionId),
          eq(orderChangeAction.order_id, id),
        ),
      )
      .limit(1)
    if (!act) {
      throw new HTTPException(404, { message: "Edit action not found" })
    }

    const details = (act.details ?? {}) as Record<string, unknown>
    const lineItemId = act.reference_id ?? (details.line_item_id as string)
    const orderItemId = details.order_item_id as string | undefined

    if (orderItemId) {
      await db.delete(orderItem).where(eq(orderItem.id, orderItemId))
    }
    if (lineItemId) {
      await db.delete(orderLineItem).where(eq(orderLineItem.id, lineItemId))
    }

    await db
      .delete(orderChangeAction)
      .where(eq(orderChangeAction.id, actionId))

    return buildDraftOrderEditPreview(id)
  },

  async addShippingMethod(
    id: string,
    data: {
      shipping_option_id: string
      custom_amount?: number
      description?: string
      internal_note?: string
      metadata?: Record<string, unknown>
    },
  ) {
    const db = getDb()
    const ord = await requireDraftOrder(db, id)
    const change = await ensureEdit(db, id)

    const amount = data.custom_amount ?? 0
    const methodId = generateId("ordsm")

    await db.insert(orderShippingMethod).values({
      id: methodId,
      name: data.description ?? "Shipping",
      amount: String(amount),
      raw_amount: { amount, precision: 2 },
      is_custom_amount: data.custom_amount != null,
      shipping_option_id: data.shipping_option_id,
      metadata: data.metadata ?? null,
    })

    await linkShippingToOrder(db, id, methodId, ord.version ?? 1)

    await insertAction(db, {
      orderId: id,
      changeId: change.id,
      version: change.version,
      action: "SHIPPING_ADD",
      reference: "order_shipping_method",
      referenceId: methodId,
      details: {
        shipping_option_id: data.shipping_option_id,
        custom_amount: data.custom_amount,
      },
    })

    return buildDraftOrderEditPreview(id)
  },

  async updateShippingMethod(
    id: string,
    methodId: string,
    data: {
      shipping_option_id?: string
      custom_amount?: number
      internal_note?: string | null
    },
  ) {
    const db = getDb()
    await ensureEdit(db, id)

    const [sm] = await db
      .select()
      .from(orderShippingMethod)
      .where(eq(orderShippingMethod.id, methodId))
      .limit(1)
    if (!sm) {
      throw new HTTPException(404, { message: "Shipping method not found" })
    }

    await db
      .update(orderShippingMethod)
      .set({
        ...(data.shipping_option_id !== undefined && {
          shipping_option_id: data.shipping_option_id,
        }),
        ...(data.custom_amount !== undefined && {
          amount: String(data.custom_amount),
          raw_amount: { amount: data.custom_amount, precision: 2 },
          is_custom_amount: true,
        }),
      })
      .where(eq(orderShippingMethod.id, methodId))

    return buildDraftOrderEditPreview(id)
  },

  async updateShippingMethodAction(
    id: string,
    actionId: string,
    data: {
      shipping_option_id: string
      custom_amount?: number | null
      description?: string | null
      internal_note?: string | null
      metadata?: Record<string, unknown> | null
    },
  ) {
    const db = getDb()
    await ensureEdit(db, id)

    const [act] = await db
      .select()
      .from(orderChangeAction)
      .where(
        and(
          eq(orderChangeAction.id, actionId),
          eq(orderChangeAction.order_id, id),
        ),
      )
      .limit(1)
    if (!act) {
      throw new HTTPException(404, { message: "Edit action not found" })
    }

    await db
      .update(orderChangeAction)
      .set({
        details: {
          ...((act.details ?? {}) as Record<string, unknown>),
          ...data,
        },
      })
      .where(eq(orderChangeAction.id, actionId))

    if (act.reference_id) {
      await db
        .update(orderShippingMethod)
        .set({
          shipping_option_id: data.shipping_option_id,
          ...(data.custom_amount != null && {
            amount: String(data.custom_amount),
            raw_amount: { amount: data.custom_amount, precision: 2 },
            is_custom_amount: true,
          }),
          ...(data.description != null && { name: data.description }),
        })
        .where(eq(orderShippingMethod.id, act.reference_id))
    }

    return buildDraftOrderEditPreview(id)
  },

  async removeShippingMethodAction(id: string, actionId: string) {
    const db = getDb()
    await ensureEdit(db, id)

    const [act] = await db
      .select()
      .from(orderChangeAction)
      .where(
        and(
          eq(orderChangeAction.id, actionId),
          eq(orderChangeAction.order_id, id),
        ),
      )
      .limit(1)
    if (!act) {
      throw new HTTPException(404, { message: "Edit action not found" })
    }

    if (act.reference_id) {
      await db
        .update(orderShippingMethod)
        .set({ deleted_at: sql`now()` })
        .where(eq(orderShippingMethod.id, act.reference_id))
    }

    await db
      .delete(orderChangeAction)
      .where(eq(orderChangeAction.id, actionId))

    return buildDraftOrderEditPreview(id)
  },

  async removeShippingMethod(id: string, methodId: string) {
    const db = getDb()
    const change = await ensureEdit(db, id)

    await db
      .update(orderShippingMethod)
      .set({ deleted_at: sql`now()` })
      .where(eq(orderShippingMethod.id, methodId))

    await insertAction(db, {
      orderId: id,
      changeId: change.id,
      version: change.version,
      action: "SHIPPING_REMOVE",
      reference: "order_shipping_method",
      referenceId: methodId,
      details: {},
    })

    return buildDraftOrderEditPreview(id)
  },

  async addPromotions(id: string, data: AdminAddDraftOrderPromotionsType) {
    const db = getDb()
    const change = await ensureEdit(db, id)

    for (const code of data.promo_codes) {
      const [promo] = await db
        .select()
        .from(promotion)
        .where(and(eq(promotion.code, code), isNull(promotion.deleted_at)))
        .limit(1)
      if (!promo) {
        throw new HTTPException(404, { message: `Promotion ${code} not found` })
      }

      await insertAction(db, {
        orderId: id,
        changeId: change.id,
        version: change.version,
        action: "PROMOTION_ADD",
        reference: "promotion",
        referenceId: promo.id,
        details: { code },
      })
    }

    return buildDraftOrderEditPreview(id)
  },

  async removePromotions(
    id: string,
    data: AdminRemoveDraftOrderPromotionsType,
  ) {
    const db = getDb()
    const change = await ensureEdit(db, id)

    for (const code of data.promo_codes) {
      const pendingAdds = await db
        .select()
        .from(orderChangeAction)
        .where(
          and(
            eq(orderChangeAction.order_change_id, change.id),
            eq(orderChangeAction.action, "PROMOTION_ADD"),
          ),
        )

      const pending = pendingAdds.find(
        (a) => (a.details as Record<string, unknown>)?.code === code,
      )
      if (pending) {
        await db
          .delete(orderChangeAction)
          .where(eq(orderChangeAction.id, pending.id))
        continue
      }

      const [promo] = await db
        .select()
        .from(promotion)
        .where(eq(promotion.code, code))
        .limit(1)

      if (promo) {
        await insertAction(db, {
          orderId: id,
          changeId: change.id,
          version: change.version,
          action: "PROMOTION_REMOVE",
          reference: "promotion",
          referenceId: promo.id,
          details: { code },
        })
      }
    }

    return buildDraftOrderEditPreview(id)
  },
}
