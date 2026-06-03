import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import {
  customer,
  getDb,
  order,
  orderItem,
  orderLineItem,
  orderLineItemTaxLine,
  orderSummary,
  salesChannel,
} from "@my-store/db"
import type { OrderFieldsConfig } from "./fields"
import type {
  FulfillmentForStatus,
  OrderItemForStatus,
  OrderLineItemJoinRow,
  OrderRelationsBundle,
  OrderRow,
  OrderShippingJoinRow,
  PaymentCollectionForStatus,
} from "./types"

type Db = ReturnType<typeof getDb>

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

function toStatusItems(
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

// raw SQL: order_payment_collection link 表无 Drizzle schema 映射
async function loadPaymentCollectionsByOrderIds(
  db: Db,
  orderIds: string[],
): Promise<Map<string, PaymentCollectionForStatus[]>> {
  if (orderIds.length === 0) return new Map()

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
}

// raw SQL: order_fulfillment link 表无 Drizzle schema 映射
async function loadFulfillmentsByOrderIds(
  db: Db,
  orderIds: string[],
): Promise<Map<string, FulfillmentForStatus[]>> {
  if (orderIds.length === 0) return new Map()

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

  const result = await db.execute(sql`
    SELECT oi.*
    FROM order_item oi
    INNER JOIN "order" o ON o.id = oi.order_id AND oi.version = o.version
    WHERE oi.order_id IN (${sql.join(orderIds.map((id) => sql`${id}`), sql`, `)})
  `)

  const rows = (result.rows ?? result) as (typeof orderItem.$inferSelect)[]
  return new Map(
    [...groupBy(rows, "order_id")].map(([orderId, items]) => [
      orderId,
      toStatusItems(items),
    ]),
  )
}

export async function loadOrderRelations(
  db: Db,
  orders: OrderRow[],
  fieldConfig: OrderFieldsConfig,
): Promise<OrderRelationsBundle> {
  const orderIds = orders.map((o) => o.id)
  const customerIds = fieldConfig.wantsCustomer
    ? [...new Set(orders.map((o) => o.customer_id).filter((id): id is string => !!id))]
    : []
  const salesChannelIds = fieldConfig.wantsSalesChannel
    ? [...new Set(orders.map((o) => o.sales_channel_id).filter((id): id is string => !!id))]
    : []

  const paymentCollectionsByOrder = await loadPaymentCollectionsByOrderIds(
    db,
    orderIds,
  )
  const fulfillmentsByOrder = await loadFulfillmentsByOrderIds(db, orderIds)
  const summariesByOrder = await loadSummariesByOrderIds(db, orderIds)
  const itemsByOrder = await loadOrderItemsByOrderIds(db, orderIds)
  const customers = customerIds.length
    ? await db
        .select()
        .from(customer)
        .where(and(inArray(customer.id, customerIds), isNull(customer.deleted_at)))
    : []
  const salesChannels = salesChannelIds.length
    ? await db
        .select()
        .from(salesChannel)
        .where(
          and(inArray(salesChannel.id, salesChannelIds), isNull(salesChannel.deleted_at)),
        )
    : []

  return {
    paymentCollectionsByOrder,
    fulfillmentsByOrder,
    summariesByOrder,
    itemsByOrder,
    customersById: new Map(customers.map((c) => [c.id, c])),
    salesChannelsById: new Map(salesChannels.map((sc) => [sc.id, sc])),
  }
}

/** 当前版本 order_item + order_line_item */
export async function loadOrderDetailLineItems(
  db: Db,
  orderId: string,
): Promise<OrderLineItemJoinRow[]> {
  const rows = await db
    .select({
      orderItem,
      lineItem: orderLineItem,
    })
    .from(orderItem)
    .innerJoin(orderLineItem, eq(orderItem.item_id, orderLineItem.id))
    .innerJoin(
      order,
      and(eq(orderItem.order_id, order.id), eq(orderItem.version, order.version)),
    )
    .where(eq(orderItem.order_id, orderId))

  return rows
}

export async function loadOrderLineItemTaxLinesByLineItemIds(
  db: Db,
  lineItemIds: string[],
) {
  if (lineItemIds.length === 0) {
    return new Map<string, (typeof orderLineItemTaxLine.$inferSelect)[]>()
  }

  const rows = await db
    .select()
    .from(orderLineItemTaxLine)
    .where(inArray(orderLineItemTaxLine.item_id, lineItemIds))

  return groupBy(rows, "item_id")
}

// raw SQL: order_shipping 关联表无 Drizzle schema 映射
export async function loadOrderDetailShippingMethods(
  db: Db,
  orderId: string,
): Promise<OrderShippingJoinRow[]> {
  const result = await db.execute(sql`
    SELECT
      osp.id,
      osp.order_id,
      osp.shipping_method_id,
      osp.version,
      osm.id AS sm_id,
      osm.name,
      osm.description,
      osm.amount,
      osm.raw_amount,
      osm.is_tax_inclusive,
      osm.is_custom_amount,
      osm.shipping_option_id,
      osm.data,
      osm.metadata,
      osm.created_at,
      osm.updated_at,
      osm.deleted_at
    FROM order_shipping osp
    INNER JOIN order_shipping_method osm ON osm.id = osp.shipping_method_id
    INNER JOIN "order" o ON o.id = osp.order_id AND osp.version = o.version
    WHERE osp.order_id = ${orderId}
      AND osm.deleted_at IS NULL
  `)

  const rows = (result.rows ?? result) as Array<Record<string, unknown>>

  return rows.map((row) => ({
    link: {
      id: String(row.id),
      order_id: String(row.order_id),
      shipping_method_id: String(row.shipping_method_id),
      version: Number(row.version),
    },
    shippingMethod: {
      id: String(row.sm_id),
      name: String(row.name),
      description: row.description,
      amount: row.amount,
      raw_amount: row.raw_amount,
      is_tax_inclusive: Boolean(row.is_tax_inclusive),
      is_custom_amount: Boolean(row.is_custom_amount),
      shipping_option_id: row.shipping_option_id,
      data: row.data,
      metadata: row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
    },
  })) as OrderShippingJoinRow[]
}
