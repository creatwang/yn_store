import { and, desc, inArray, isNull, sql } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import {
  customer,
  order,
  orderItem,
  orderSummary,
  salesChannel,
} from "@my-store/db"
import {
  applyOrderFieldMask,
  type OrderFieldsConfig,
  resolveOrderFieldsConfig,
} from "../lib/order-fields"
import {
  extractOrderTotal,
  getLastFulfillmentStatus,
  getLastPaymentStatus,
  type FulfillmentForStatus,
  type OrderForAggregateStatus,
  type OrderItemForStatus,
  type PaymentCollectionForStatus,
} from "../lib/order-aggregate-status"

type OrderRow = typeof order.$inferSelect
type Db = NodePgDatabase<Record<string, never>>

function groupBy<T extends Record<string, unknown>>(
  rows: T[],
  key: keyof T,
): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const id = String(row[key])
    const list = map.get(id) ?? []
    list.push(row)
    map.set(id, list)
  }
  return map
}

/** 对齐 formatOrder / aggregate-status 所需的 items 形状 */
function formatOrderItemsForStatus(
  rows: (typeof orderItem.$inferSelect)[],
): OrderItemForStatus[] {
  return rows.map((row) => ({
    raw_quantity: row.raw_quantity,
    detail: {
      raw_fulfilled_quantity: row.raw_fulfilled_quantity,
      quantity: row.quantity,
    },
  }))
}

async function loadPaymentCollectionsByOrderIds(
  db: Db,
  orderIds: string[],
): Promise<Map<string, PaymentCollectionForStatus[]>> {
  if (orderIds.length === 0) return new Map()

  try {
    const result = await db.execute(sql`
      SELECT opc.order_id, pc.amount, pc.captured_amount, pc.refunded_amount, pc.status
      FROM order_payment_collection opc
      INNER JOIN payment_collection pc ON pc.id = opc.payment_collection_id
      WHERE opc.order_id IN (${sql.join(orderIds.map((id) => sql`${id}`), sql`, `)})
        AND opc.deleted_at IS NULL
        AND pc.deleted_at IS NULL
    `)

    const rows = (result.rows ?? result) as Array<
      PaymentCollectionForStatus & { order_id: string }
    >
    return groupBy(rows, "order_id")
  } catch {
    return new Map()
  }
}

/** 对齐官方 order_fulfillment link（非 fulfillment_item 间接关联） */
async function loadFulfillmentsByOrderIds(
  db: Db,
  orderIds: string[],
): Promise<Map<string, FulfillmentForStatus[]>> {
  if (orderIds.length === 0) return new Map()

  try {
    const result = await db.execute(sql`
      SELECT of.order_id, f.id, f.packed_at, f.shipped_at, f.delivered_at, f.canceled_at
      FROM order_fulfillment of
      INNER JOIN fulfillment f ON f.id = of.fulfillment_id
      WHERE of.order_id IN (${sql.join(orderIds.map((id) => sql`${id}`), sql`, `)})
        AND of.deleted_at IS NULL
        AND f.deleted_at IS NULL
    `)

    const rows = (result.rows ?? result) as Array<
      FulfillmentForStatus & { order_id: string }
    >
    return groupBy(rows, "order_id")
  } catch {
    return new Map()
  }
}

async function loadSummariesByOrderIds(
  db: Db,
  orderIds: string[],
): Promise<Map<string, typeof orderSummary.$inferSelect>> {
  if (orderIds.length === 0) return new Map()

  const rows = await db
    .select()
    .from(orderSummary)
    .where(inArray(orderSummary.order_id, orderIds))
    .orderBy(desc(orderSummary.version))
    .catch(() => [])

  const map = new Map<string, typeof orderSummary.$inferSelect>()
  for (const row of rows) {
    if (!map.has(row.order_id)) {
      map.set(row.order_id, row)
    }
  }
  return map
}

/** 仅取与 order.version 一致的 order_item（对齐官方当前版本行项） */
async function loadOrderItemsByOrderIds(
  db: Db,
  orderIds: string[],
): Promise<Map<string, OrderItemForStatus[]>> {
  if (orderIds.length === 0) return new Map()

  try {
    const result = await db.execute(sql`
      SELECT oi.*
      FROM order_item oi
      INNER JOIN "order" o ON o.id = oi.order_id AND oi.version = o.version
      WHERE oi.order_id IN (${sql.join(orderIds.map((id) => sql`${id}`), sql`, `)})
        AND oi.deleted_at IS NULL
    `)

    const rows = (result.rows ?? result) as (typeof orderItem.$inferSelect)[]
    return new Map(
      [...groupBy(rows, "order_id")].map(([orderId, items]) => [
        orderId,
        formatOrderItemsForStatus(items),
      ]),
    )
  } catch {
    return new Map()
  }
}

function buildStatusInput(
  orderRow: OrderRow,
  relations: {
    payment_collections: PaymentCollectionForStatus[]
    fulfillments: FulfillmentForStatus[]
    items: OrderItemForStatus[]
  },
): OrderForAggregateStatus {
  return {
    currency_code: orderRow.currency_code,
    payment_collections: relations.payment_collections,
    fulfillments: relations.fulfillments,
    items: relations.items,
  }
}

export type EnrichOrdersOptions = {
  fields?: string
}

export async function enrichOrdersForAdmin(
  db: Db,
  orders: OrderRow[],
  options: EnrichOrdersOptions = {},
) {
  if (orders.length === 0) return []

  const fieldConfig = resolveOrderFieldsConfig(options.fields)
  const orderIds = orders.map((o) => o.id)
  const customerIds = fieldConfig.wantsCustomer
    ? [...new Set(orders.map((o) => o.customer_id).filter((id): id is string => !!id))]
    : []
  const salesChannelIds = fieldConfig.wantsSalesChannel
    ? [...new Set(orders.map((o) => o.sales_channel_id).filter((id): id is string => !!id))]
    : []

  const [
    paymentCollectionsByOrder,
    fulfillmentsByOrder,
    summariesByOrder,
    itemsByOrder,
    customers,
    salesChannels,
  ] = await Promise.all([
    loadPaymentCollectionsByOrderIds(db, orderIds),
    loadFulfillmentsByOrderIds(db, orderIds),
    loadSummariesByOrderIds(db, orderIds),
    loadOrderItemsByOrderIds(db, orderIds),
    customerIds.length
      ? db
          .select()
          .from(customer)
          .where(and(inArray(customer.id, customerIds), isNull(customer.deleted_at)))
          .catch(() => [])
      : Promise.resolve([]),
    salesChannelIds.length
      ? db
          .select()
          .from(salesChannel)
          .where(and(inArray(salesChannel.id, salesChannelIds), isNull(salesChannel.deleted_at)))
          .catch(() => [])
      : Promise.resolve([]),
  ])

  const customerMap = new Map(customers.map((c) => [c.id, c]))
  const salesChannelMap = new Map(salesChannels.map((sc) => [sc.id, sc]))

  return orders.map((orderRow) => {
    const payment_collections = paymentCollectionsByOrder.get(orderRow.id) ?? []
    const fulfillments = fulfillmentsByOrder.get(orderRow.id) ?? []
    const items = itemsByOrder.get(orderRow.id) ?? []
    const summaryRow = summariesByOrder.get(orderRow.id) ?? null
    const statusInput = buildStatusInput(orderRow, {
      payment_collections,
      fulfillments,
      items,
    })

    const enriched = {
      ...orderRow,
      ...(fieldConfig.wantsCustomer
        ? {
            customer: orderRow.customer_id
              ? customerMap.get(orderRow.customer_id) ?? null
              : null,
          }
        : {}),
      ...(fieldConfig.wantsSalesChannel
        ? {
            sales_channel: orderRow.sales_channel_id
              ? salesChannelMap.get(orderRow.sales_channel_id) ?? null
              : null,
          }
        : {}),
      payment_collections,
      fulfillments,
      ...(fieldConfig.wantsSummary
        ? { summary: summaryRow?.totals ?? null }
        : {}),
      ...(fieldConfig.wantsTotal
        ? { total: extractOrderTotal(summaryRow) }
        : {}),
      payment_status: getLastPaymentStatus(statusInput),
      fulfillment_status: getLastFulfillmentStatus(statusInput),
    }

    return applyOrderFieldMask(enriched, fieldConfig)
  })
}

export { resolveOrderFieldsConfig, type OrderFieldsConfig }
