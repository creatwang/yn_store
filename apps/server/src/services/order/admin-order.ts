/**
 * Admin 订单 DTO
 *
 * 对齐官方两条链路（Hono 重写版，单文件）：
 * 1. @medusajs/order formatOrder      — items / shipping / summary 整形
 * 2. @medusajs/utils decorateCartTotals — 行级 + 订单级金额汇总
 *
 * 对外 API：presentAdminOrders / presentAdminOrderDetail
 */
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import {
  customer,
  order,
  orderAddress,
  orderCreditLine,
  orderItem,
  orderLineItem,
  orderLineItemAdjustment,
  orderLineItemTaxLine,
  orderPromotion,
  orderShippingMethodAdjustment,
  orderShippingMethodTaxLine,
  orderSummary,
  product,
  productVariant,
  productVariantInventoryItem,
  region,
  salesChannel,
} from "@my-store/db"
import { getCurrencyEpsilon, toAmount } from "../../lib/big-number"
import {
  applyOrderFieldMask,
  DEFAULT_ADMIN_ORDER_RETRIEVE_FIELDS,
  needsFullOrderDetailLoad,
  resolveOrderFieldsConfig,
  type OrderFieldsConfig,
} from "./fields"
import {
  extractOrderTotal,
  getLastFulfillmentStatus,
  getLastPaymentStatus,
  toOrderStatusInput,
} from "./status"
import type {
  AdminOrderSummaryDto,
  OrderLineItemJoinRow,
  OrderLineItemTaxLineRow,
  OrderRelationsBundle,
  OrderRow,
  OrderShippingJoinRow,
  OrderStatusInput,
  PaymentCollectionForStatus,
} from "./types"

type Db = NodePgDatabase<Record<string, never>>

export type PresentAdminOrdersOptions = { fields?: string }

// ─────────────────────────────────────────────────────────────────────────────
// decorateCartTotals（对齐 @medusajs/utils totals/cart）
// ─────────────────────────────────────────────────────────────────────────────

const SUMMARY_DEFAULTS: AdminOrderSummaryDto = {
  total: 0,
  subtotal: 0,
  tax_total: 0,
  discount_total: 0,
  discount_subtotal: 0,
  discount_tax_total: 0,
  shipping_total: 0,
  shipping_subtotal: 0,
  shipping_tax_total: 0,
  transaction_total: 0,
  pending_difference: 0,
  item_subtotal: 0,
  item_total: 0,
  item_tax_total: 0,
  item_discount_total: 0,
  credit_line_total: 0,
  credit_line_subtotal: 0,
  credit_line_tax_total: 0,
  original_item_subtotal: 0,
  original_item_total: 0,
  original_item_tax_total: 0,
  original_shipping_subtotal: 0,
  original_shipping_total: 0,
  original_shipping_tax_total: 0,
  original_total: 0,
  original_tax_total: 0,
  original_subtotal: 0,
  refundable_total: 0,
  shipping_discount_total: 0,
}

const ORDER_ROOT_TOTAL_KEYS = [
  "total",
  "subtotal",
  "tax_total",
  "discount_total",
  "discount_subtotal",
  "discount_tax_total",
  "credit_line_total",
  "credit_line_subtotal",
  "credit_line_tax_total",
  "item_subtotal",
  "item_total",
  "item_tax_total",
  "original_item_tax_total",
  "original_item_total",
  "original_item_subtotal",
  "item_discount_total",
  "shipping_subtotal",
  "shipping_total",
  "shipping_tax_total",
  "original_shipping_tax_total",
  "original_shipping_subtotal",
  "original_shipping_total",
  "shipping_discount_total",
  "original_total",
  "original_tax_total",
  "original_subtotal",
  "refundable_total",
  "transaction_total",
] as const

type DecoratedLineItem = Record<string, unknown> & {
  unit_price: number
  quantity: number
  is_tax_inclusive?: boolean
  tax_lines?: Array<{ rate: number; subtotal?: number }>
  adjustments?: Array<{ amount: unknown }>
  detail?: Record<string, unknown>
}

type DecoratedShippingMethod = Record<string, unknown> & {
  amount: number
  is_tax_inclusive?: boolean
  tax_lines?: Array<{ rate: number; subtotal?: number }>
  adjustments?: Array<{ amount: unknown }>
}

function sumTaxRate(taxLines: Array<{ rate: number }> = []) {
  return taxLines.reduce((acc, line) => acc + toAmount(line.rate), 0) / 100
}

function sumAdjustments(adjustments: Array<{ amount: unknown }> = []) {
  return adjustments.reduce((acc, adj) => acc + toAmount(adj.amount), 0)
}

/** 对齐 getLineItemTotals */
function decorateLineItemTotals(item: DecoratedLineItem) {
  const unitPrice = toAmount(item.unit_price)
  const quantity = toAmount(item.quantity)
  const totalItemPrice = unitPrice * quantity
  const taxRate = sumTaxRate(item.tax_lines)
  const isTaxInclusive = Boolean(item.is_tax_inclusive)
  const subtotal = isTaxInclusive
    ? totalItemPrice / (1 + taxRate || 1)
    : totalItemPrice
  const discountTotal = sumAdjustments(item.adjustments)
  const taxable = Math.max(subtotal - discountTotal, 0)
  const taxTotal = taxable * taxRate
  const total = isTaxInclusive ? totalItemPrice - discountTotal : taxable + taxTotal

  return {
    subtotal,
    total,
    tax_total: taxTotal,
    original_total: totalItemPrice,
    original_tax_total: taxTotal,
    discount_total: discountTotal,
    discount_subtotal: discountTotal,
  }
}

/** 对齐 getShippingMethodsTotals */
function decorateShippingMethodTotals(method: DecoratedShippingMethod) {
  const amount = toAmount(method.amount)
  const taxRate = sumTaxRate(method.tax_lines)
  const isTaxInclusive = Boolean(method.is_tax_inclusive)
  const subtotal = isTaxInclusive ? amount / (1 + taxRate || 1) : amount
  const discountTotal = sumAdjustments(method.adjustments)
  const taxable = Math.max(subtotal - discountTotal, 0)
  const taxTotal = taxable * taxRate
  const total = isTaxInclusive ? amount - discountTotal : taxable + taxTotal

  return {
    subtotal,
    total,
    tax_total: taxTotal,
    original_total: amount,
    original_tax_total: taxTotal,
    discount_total: discountTotal,
    discount_subtotal: discountTotal,
  }
}

function parseSummaryTotals(
  summaryRow: { totals: unknown } | null | undefined,
): AdminOrderSummaryDto {
  if (!summaryRow?.totals || typeof summaryRow.totals !== "object") {
    return { ...SUMMARY_DEFAULTS }
  }

  const raw = summaryRow.totals as Record<string, unknown>
  const normalized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(raw)) {
    if (value === null || value === undefined) {
      normalized[key] = value
      continue
    }
    if (typeof value === "object" && !Array.isArray(value)) {
      normalized[key] = toAmount(value)
    } else if (typeof value === "string" || typeof value === "number") {
      normalized[key] = toAmount(value)
    } else {
      normalized[key] = value
    }
  }

  return {
    ...SUMMARY_DEFAULTS,
    ...normalized,
    total: toAmount(raw.total ?? raw.original_order_total ?? SUMMARY_DEFAULTS.total),
    transaction_total: toAmount(
      raw.transaction_total ?? SUMMARY_DEFAULTS.transaction_total,
    ),
    pending_difference: toAmount(
      raw.pending_difference ?? SUMMARY_DEFAULTS.pending_difference,
    ),
  }
}

function applyRootTotals(order: Record<string, unknown>, summary: AdminOrderSummaryDto) {
  const rootTotals: Record<string, unknown> = {}
  for (const key of ORDER_ROOT_TOTAL_KEYS) {
    if (summary[key] !== undefined) {
      rootTotals[key] = summary[key]
    }
  }
  return { ...order, ...rootTotals, total: summary.total, summary }
}

/**
 * 对齐 decorateCartTotals + formatOrder 最后一步。
 * 有 items 时从行项重算；否则用 order_summary；transaction_total 以 DB 为准。
 */
function decorateOrderTotals(order: Record<string, unknown>) {
  const storedSummary = (order.summary ?? {}) as AdminOrderSummaryDto
  const items = (order.items ?? []) as DecoratedLineItem[]
  const shippingMethods = (order.shipping_methods ?? []) as DecoratedShippingMethod[]

  if (items.length === 0 && shippingMethods.length === 0) {
    return applyRootTotals(order, parseSummaryTotals({ totals: storedSummary }))
  }

  let itemSubtotal = 0
  let itemTotal = 0
  let itemTaxTotal = 0
  let itemDiscountTotal = 0
  let originalItemTotal = 0
  let originalItemTaxTotal = 0

  const decoratedItems = items.map((item) => {
    const totals = decorateLineItemTotals(item)
    itemSubtotal += totals.subtotal
    itemTotal += totals.total
    itemTaxTotal += totals.tax_total
    itemDiscountTotal += totals.discount_total
    originalItemTotal += totals.original_total
    originalItemTaxTotal += totals.original_tax_total
    return { ...item, ...totals }
  })

  let shippingSubtotal = 0
  let shippingTotal = 0
  let shippingTaxTotal = 0
  let shippingDiscountTotal = 0
  let originalShippingTotal = 0
  let originalShippingTaxTotal = 0

  const decoratedShipping = shippingMethods.map((method) => {
    const totals = decorateShippingMethodTotals(method)
    shippingSubtotal += totals.subtotal
    shippingTotal += totals.total
    shippingTaxTotal += totals.tax_total
    shippingDiscountTotal += totals.discount_total
    originalShippingTotal += totals.original_total
    originalShippingTaxTotal += totals.original_tax_total
    return { ...method, ...totals }
  })

  const computedSubtotal = itemSubtotal + shippingSubtotal
  const computedTaxTotal = itemTaxTotal + shippingTaxTotal
  const computedDiscountTotal = itemDiscountTotal + shippingDiscountTotal
  const computedTotal = itemTotal + shippingTotal

  const summary: AdminOrderSummaryDto = {
    ...SUMMARY_DEFAULTS,
    ...storedSummary,
    item_subtotal: storedSummary.item_subtotal ?? itemSubtotal,
    item_total: storedSummary.item_total ?? itemTotal,
    item_tax_total: storedSummary.item_tax_total ?? itemTaxTotal,
    item_discount_total: storedSummary.item_discount_total ?? itemDiscountTotal,
    original_item_total: storedSummary.original_item_total ?? originalItemTotal,
    original_item_tax_total: storedSummary.original_item_tax_total ?? originalItemTaxTotal,
    shipping_subtotal: storedSummary.shipping_subtotal ?? shippingSubtotal,
    shipping_total: storedSummary.shipping_total ?? shippingTotal,
    shipping_tax_total: storedSummary.shipping_tax_total ?? shippingTaxTotal,
    shipping_discount_total: storedSummary.shipping_discount_total ?? shippingDiscountTotal,
    original_shipping_total: storedSummary.original_shipping_total ?? originalShippingTotal,
    original_shipping_tax_total:
      storedSummary.original_shipping_tax_total ?? originalShippingTaxTotal,
    subtotal: storedSummary.subtotal ?? computedSubtotal,
    tax_total: storedSummary.tax_total ?? computedTaxTotal,
    discount_total: storedSummary.discount_total ?? computedDiscountTotal,
    original_total:
      storedSummary.original_total ?? originalItemTotal + originalShippingTotal,
    original_tax_total:
      storedSummary.original_tax_total ?? originalItemTaxTotal + originalShippingTaxTotal,
    total: storedSummary.total ?? computedTotal,
    transaction_total: storedSummary.transaction_total ?? 0,
  }

  const epsilon = getCurrencyEpsilon(String(order.currency_code ?? ""))
  const pendingDiff = summary.total - summary.transaction_total
  summary.pending_difference =
    storedSummary.pending_difference ??
    (Math.abs(pendingDiff) <= epsilon ? 0 : pendingDiff)

  return applyRootTotals(
    { ...order, items: decoratedItems, shipping_methods: decoratedShipping },
    summary,
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// formatOrder（对齐 @medusajs/order formatOrder）
// ─────────────────────────────────────────────────────────────────────────────

function formatLineItemDetail(row: OrderLineItemJoinRow["orderItem"]) {
  return {
    id: row.id,
    version: row.version,
    item_id: row.item_id,
    order_id: row.order_id,
    quantity: toAmount(row.quantity ?? row.raw_quantity),
    raw_quantity: row.raw_quantity,
    fulfilled_quantity: toAmount(row.fulfilled_quantity ?? row.raw_fulfilled_quantity),
    raw_fulfilled_quantity: row.raw_fulfilled_quantity,
    shipped_quantity: toAmount(row.shipped_quantity ?? row.raw_shipped_quantity),
    delivered_quantity: toAmount(row.delivered_quantity ?? row.raw_delivered_quantity),
    unit_price: toAmount(row.unit_price ?? row.raw_unit_price),
    raw_unit_price: row.raw_unit_price,
    compare_at_unit_price: toAmount(
      row.compare_at_unit_price ?? row.raw_compare_at_unit_price,
    ),
    metadata: row.metadata,
  }
}

function formatTaxLine(
  row: OrderLineItemTaxLineRow,
  taxableAmount: number,
) {
  const rate = toAmount(row.rate ?? row.raw_rate)
  return { ...row, rate, subtotal: taxableAmount * (rate / 100) }
}

function formatLineItem(
  row: OrderLineItemJoinRow,
  taxLines: OrderLineItemTaxLineRow[] = [],
  adjustments: (typeof orderLineItemAdjustment.$inferSelect)[] = [],
  inventoryItemsByVariant?: Map<string, any[]>,
) {
  const { orderItem: detailRow, lineItem, variant, product: productRow } = row
  const detail = formatLineItemDetail(detailRow)
  const unitPrice = toAmount(
    detailRow.unit_price ??
      detailRow.raw_unit_price ??
      lineItem.unit_price ??
      lineItem.raw_unit_price,
  )

  const item = {
    ...lineItem,
    product_title: productRow?.title ?? lineItem.title ?? null,
    variant_title: variant?.title ?? null,
    variant_sku: variant?.sku ?? null,
    unit_price: unitPrice,
    compare_at_unit_price: toAmount(
      detailRow.compare_at_unit_price ??
        detailRow.raw_compare_at_unit_price ??
        lineItem.compare_at_unit_price ??
        lineItem.raw_compare_at_unit_price,
    ),
    quantity: detail.quantity,
    raw_quantity: detailRow.raw_quantity,
    metadata: detailRow.metadata ?? lineItem.metadata,
    detail,
    variant: variant
      ? {
          id: variant.id,
          title: variant.title,
          sku: variant.sku,
          barcode: variant.barcode,
          ean: variant.ean,
          upc: variant.upc,
          inventory_quantity: null,
          allow_backorder: variant.allow_backorder,
          manage_inventory: variant.manage_inventory,
          weight: variant.weight,
          length: variant.length,
          height: variant.height,
          width: variant.width,
          origin_country: variant.origin_country,
          hs_code: variant.hs_code,
          material: variant.material,
          mid_code: variant.mid_code,
          metadata: variant.metadata,
          created_at: variant.created_at,
          updated_at: variant.updated_at,
          deleted_at: variant.deleted_at,
          product: productRow
            ? {
                id: productRow.id,
                title: productRow.title,
                handle: productRow.handle,
                subtitle: productRow.subtitle,
                description: productRow.description,
                thumbnail: productRow.thumbnail,
                status: productRow.status,
                weight: productRow.weight,
                length: productRow.length,
                height: productRow.height,
                width: productRow.width,
                origin_country: productRow.origin_country,
                hs_code: productRow.hs_code,
                mid_code: productRow.mid_code,
                material: productRow.material,
                collection_id: productRow.collection_id,
                type_id: productRow.type_id,
                metadata: productRow.metadata,
                created_at: productRow.created_at,
                updated_at: productRow.updated_at,
                deleted_at: productRow.deleted_at,
              }
            : null,
        inventory_items: variant && inventoryItemsByVariant ? (inventoryItemsByVariant.get(variant.id) ?? []) : [],
        }
      : null,
    tax_lines: taxLines.map((line) =>
      formatTaxLine(line, unitPrice * detail.quantity),
    ),
    adjustments: adjustments.map((adj) => ({
      ...adj,
      amount: toAmount(adj.amount ?? adj.raw_amount),
    })),
  }

  return item
}

function formatShippingMethod(
  row: OrderShippingJoinRow,
  taxLines: (typeof orderShippingMethodTaxLine.$inferSelect)[] = [],
  adjustments: (typeof orderShippingMethodAdjustment.$inferSelect)[] = [],
) {
  const { link, shippingMethod } = row
  const amount = toAmount(shippingMethod.amount ?? shippingMethod.raw_amount)

  return {
    ...shippingMethod,
    amount,
    order_id: link.order_id,
    detail: {
      id: link.id,
      order_id: link.order_id,
      shipping_method_id: link.shipping_method_id,
      version: link.version,
    },
    tax_lines: taxLines.map((line) => formatTaxLine(line as any, amount)),
    adjustments: adjustments.map((adj) => ({
      ...adj,
      amount: toAmount(adj.amount ?? adj.raw_amount),
    })),
  }
}

function formatAdminOrder(input: {
  order: Record<string, unknown>
  summaryRow: { totals: unknown } | null | undefined
  lineItemRows?: OrderLineItemJoinRow[]
  shippingRows?: OrderShippingJoinRow[]
  taxLinesByLineItemId?: Map<string, OrderLineItemTaxLineRow[]>
  adjustmentsByLineItemId?: Map<string, (typeof orderLineItemAdjustment.$inferSelect)[]>
  shippingTaxByMethodId?: Map<string, (typeof orderShippingMethodTaxLine.$inferSelect)[]>
  shippingAdjByMethodId?: Map<string, (typeof orderShippingMethodAdjustment.$inferSelect)[]>
}) {
  const summary = parseSummaryTotals(input.summaryRow)
  const base = { ...input.order, summary }

  const withRelations = {
    ...base,
    ...(input.lineItemRows
      ? {
          items: input.lineItemRows.map((row) =>
            formatLineItem(
              row,
              input.taxLinesByLineItemId?.get(row.lineItem.id) ?? [],
              input.adjustmentsByLineItemId?.get(row.lineItem.id) ?? [],
              (input as any).inventoryItemsByVariant,
            ),
          ),
        }
      : {}),
    ...(input.shippingRows
      ? {
          shipping_methods: input.shippingRows.map((row) =>
            formatShippingMethod(
              row,
              input.shippingTaxByMethodId?.get(row.shippingMethod.id) ?? [],
              input.shippingAdjByMethodId?.get(row.shippingMethod.id) ?? [],
            ),
          ),
        }
      : {}),
  }

  return decorateOrderTotals(withRelations)
}

// ─────────────────────────────────────────────────────────────────────────────
// 读库
// ─────────────────────────────────────────────────────────────────────────────

function groupBy<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const id = String(row[key])
    const list = map.get(id) ?? []
    list.push(row)
    map.set(id, list)
  }
  return map
}

async function loadPaymentCollections(db: Db, orderIds: string[]) {
  if (orderIds.length === 0) return new Map<string, PaymentCollectionForStatus[]>()

  const result = await db.execute(sql`
    SELECT opc.order_id,
      pc.id AS pc_id, pc.amount, pc.captured_amount, pc.refunded_amount, pc.status, pc.currency_code, pc.created_at,
      p.id AS p_id, p.amount AS p_amount, p.raw_amount AS p_raw_amount, p.currency_code AS p_currency_code,
      p.provider_id, p.data AS p_data, p.captured_at, p.created_at AS p_created_at,
      r.id AS r_id, r.amount AS r_amount, r.raw_amount AS r_raw_amount, r.note, r.created_by, r.created_at AS r_created_at, r.refund_reason_id,
      rr.id AS rr_id, rr.label AS rr_label, rr.code AS rr_code, rr.description AS rr_description
    FROM order_payment_collection opc
    INNER JOIN payment_collection pc ON pc.id = opc.payment_collection_id
    LEFT JOIN payment p ON p.payment_collection_id = pc.id AND p.deleted_at IS NULL
    LEFT JOIN refund r ON r.payment_id = p.id AND r.deleted_at IS NULL
    LEFT JOIN refund_reason rr ON rr.id = r.refund_reason_id AND rr.deleted_at IS NULL
    WHERE opc.order_id IN (${sql.join(orderIds.map((id) => sql`${id}`), sql`, `)})
      AND opc.deleted_at IS NULL AND pc.deleted_at IS NULL
    ORDER BY opc.order_id, pc.created_at
  `)

  const rows = (result.rows ?? result) as any[]
  const byOrder = new Map<string, Map<string, PaymentCollectionForStatus>>()

  for (const row of rows) {
    if (!byOrder.has(row.order_id)) byOrder.set(row.order_id, new Map())
    const orderPcs = byOrder.get(row.order_id)!

    if (!orderPcs.has(row.pc_id)) {
      orderPcs.set(row.pc_id, {
        id: row.pc_id,
        amount: row.amount,
        captured_amount: row.captured_amount,
        refunded_amount: row.refunded_amount,
        status: row.status,
        currency_code: row.currency_code,
        created_at: row.created_at,
        payments: [],
      })
    }

    const pc = orderPcs.get(row.pc_id)!
    if (row.p_id && !pc.payments!.find((p: any) => p.id === row.p_id)) {
      pc.payments!.push({
        id: row.p_id,
        amount: row.p_amount,
        currency_code: row.p_currency_code,
        provider_id: row.provider_id,
        captured_at: row.captured_at,
        created_at: row.p_created_at,
        refunds: [],
      })
    }

    if (row.p_id && row.r_id) {
      const payment = pc.payments!.find((p: any) => p.id === row.p_id)
      if (payment && !payment.refunds!.find((r: any) => r.id === row.r_id)) {
        payment.refunds!.push({
          id: row.r_id,
          amount: row.r_amount,
          note: row.note,
          created_by: row.created_by,
          created_at: row.r_created_at,
          refund_reason_id: row.refund_reason_id,
          refund_reason: row.rr_id ? {
            id: row.rr_id,
            label: row.rr_label,
            code: row.rr_code,
            description: row.rr_description,
          } : null,
        })
      }
    }
  }

  const resultMap = new Map<string, PaymentCollectionForStatus[]>()
  for (const [oid, pcs] of byOrder) {
    resultMap.set(oid, [...pcs.values()])
  }
  return resultMap
}

async function loadFulfillments(db: Db, orderIds: string[]) {
  if (orderIds.length === 0) return new Map()

  const result = await db.execute(sql`
    SELECT of.order_id, f.id, f.packed_at, f.shipped_at, f.delivered_at, f.canceled_at,
      f.location_id, f.shipping_option_id, f.provider_id, f.metadata,
      fi.id AS fi_id, fi.title AS fi_title, fi.sku AS fi_sku, fi.quantity AS fi_quantity, fi.line_item_id,
      fl.id AS fl_id, fl.tracking_number, fl.tracking_url, fl.label_url,
      so.id AS so_id, so.name AS so_name,
      sz.id AS sz_id, sz.name AS sz_name,
      fs.id AS fs_id, fs.name AS fs_name, fs.type AS fs_type
    FROM order_fulfillment of
    INNER JOIN fulfillment f ON f.id = of.fulfillment_id
    LEFT JOIN fulfillment_item fi ON fi.fulfillment_id = f.id
    LEFT JOIN fulfillment_label fl ON fl.fulfillment_id = f.id
    LEFT JOIN shipping_option so ON so.id = f.shipping_option_id
    LEFT JOIN service_zone sz ON sz.id = so.service_zone_id
    LEFT JOIN fulfillment_set fs ON fs.id = sz.fulfillment_set_id
    WHERE of.order_id IN (${sql.join(orderIds.map((id) => sql`${id}`), sql`, `)})
      AND of.deleted_at IS NULL AND f.deleted_at IS NULL
  `)

  const byOrder = new Map<string, Map<string, Record<string, unknown>>>()

  for (const row of (result.rows ?? result) as Array<Record<string, unknown>>) {
    const orderId = String(row.order_id)
    const fid = String(row.id)
    if (!byOrder.has(orderId)) byOrder.set(orderId, new Map())
    const orderMap = byOrder.get(orderId)!
    if (!orderMap.has(fid)) {
      orderMap.set(fid, {
        id: fid,
        packed_at: row.packed_at,
        shipped_at: row.shipped_at,
        delivered_at: row.delivered_at,
        canceled_at: row.canceled_at,
        location_id: row.location_id,
        provider_id: row.provider_id,
        metadata: row.metadata,
        shipping_option: row.so_id
          ? {
              id: row.so_id,
              name: row.so_name,
              service_zone: row.sz_id
                ? {
                    id: row.sz_id,
                    name: row.sz_name,
                    fulfillment_set: row.fs_id
                      ? { id: row.fs_id, name: row.fs_name, type: row.fs_type }
                      : null,
                  }
                : null,
            }
          : null,
        items: [],
        labels: [],
      })
    }
    const fulfillment = orderMap.get(fid)!
    const items = fulfillment.items as Array<Record<string, unknown>>
    const labels = fulfillment.labels as Array<Record<string, unknown>>
    if (row.fi_id && !items.find((i) => i.id === row.fi_id)) {
      items.push({
        id: row.fi_id,
        title: row.fi_title,
        sku: row.fi_sku,
        quantity: row.fi_quantity,
        line_item_id: row.line_item_id,
      })
    }
    if (row.fl_id && !labels.find((l) => l.id === row.fl_id)) {
      labels.push({
        id: row.fl_id,
        tracking_number: row.tracking_number,
        tracking_url: row.tracking_url,
        label_url: row.label_url,
      })
    }
  }

  const resultMap = new Map<string, Array<Record<string, unknown>>>()
  for (const [oid, fmap] of byOrder) {
    resultMap.set(oid, [...fmap.values()])
  }
  return resultMap
}

async function loadSummaries(db: Db, orderIds: string[]) {
  if (orderIds.length === 0) return new Map()

  const rows = await db
    .select()
    .from(orderSummary)
    .where(inArray(orderSummary.order_id, orderIds))
    .orderBy(desc(orderSummary.version))

  const map = new Map<string, (typeof orderSummary.$inferSelect)>()
  for (const row of rows) {
    if (!map.has(row.order_id)) map.set(row.order_id, row)
  }
  return map
}

async function loadStatusItems(db: Db, orderIds: string[]) {
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
      items.map((row) => ({
        raw_quantity: row.raw_quantity,
        detail: { raw_fulfilled_quantity: row.raw_fulfilled_quantity, quantity: row.quantity },
      })),
    ]),
  )
}

async function loadRelations(
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

  const paymentCollectionsByOrder = await loadPaymentCollections(db, orderIds)
  const fulfillmentsByOrder = await loadFulfillments(db, orderIds)
  const summariesByOrder = await loadSummaries(db, orderIds)
  const itemsByOrder = await loadStatusItems(db, orderIds)
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

async function loadDetailLineItems(db: Db, orderId: string): Promise<OrderLineItemJoinRow[]> {
  return db
    .select({ orderItem, lineItem: orderLineItem, variant: productVariant, product })
    .from(orderItem)
    .innerJoin(orderLineItem, eq(orderItem.item_id, orderLineItem.id))
    .innerJoin(order, and(eq(orderItem.order_id, order.id), eq(orderItem.version, order.version)))
    .leftJoin(productVariant, eq(orderLineItem.variant_id, productVariant.id))
    .leftJoin(product, eq(orderLineItem.product_id, product.id))
    .where(eq(orderItem.order_id, orderId))
}

async function loadDetailShipping(db: Db, orderId: string): Promise<OrderShippingJoinRow[]> {
  const result = await db.execute(sql`
    SELECT osp.id, osp.order_id, osp.shipping_method_id, osp.version,
      osm.id AS sm_id, osm.name, osm.description, osm.amount, osm.raw_amount,
      osm.is_tax_inclusive, osm.is_custom_amount, osm.shipping_option_id,
      osm.data, osm.metadata, osm.created_at, osm.updated_at, osm.deleted_at
    FROM order_shipping osp
    INNER JOIN order_shipping_method osm ON osm.id = osp.shipping_method_id
    INNER JOIN "order" o ON o.id = osp.order_id AND osp.version = o.version
    WHERE osp.order_id = ${orderId} AND osm.deleted_at IS NULL
  `)

  return ((result.rows ?? result) as Array<Record<string, unknown>>).map((row) => ({
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

async function loadLineItemTaxLines(db: Db, lineItemIds: string[]) {
  if (lineItemIds.length === 0) return new Map<string, OrderLineItemTaxLineRow[]>()
  const rows = await db
    .select()
    .from(orderLineItemTaxLine)
    .where(inArray(orderLineItemTaxLine.item_id, lineItemIds))
  return groupBy(rows, "item_id")
}

async function loadLineItemAdjustments(db: Db, lineItemIds: string[]) {
  if (lineItemIds.length === 0) {
    return new Map<string, (typeof orderLineItemAdjustment.$inferSelect)[]>()
  }
  const rows = await db
    .select()
    .from(orderLineItemAdjustment)
    .where(inArray(orderLineItemAdjustment.item_id, lineItemIds))
  return groupBy(rows, "item_id")
}

async function loadShippingTaxLines(db: Db, shippingMethodIds: string[]) {
  if (shippingMethodIds.length === 0) {
    return new Map<string, (typeof orderShippingMethodTaxLine.$inferSelect)[]>()
  }
  const rows = await db
    .select()
    .from(orderShippingMethodTaxLine)
    .where(inArray(orderShippingMethodTaxLine.shipping_method_id, shippingMethodIds))
  return groupBy(rows, "shipping_method_id")
}

async function loadShippingAdjustments(db: Db, shippingMethodIds: string[]) {
  if (shippingMethodIds.length === 0) {
    return new Map<string, (typeof orderShippingMethodAdjustment.$inferSelect)[]>()
  }
  const rows = await db
    .select()
    .from(orderShippingMethodAdjustment)
    .where(inArray(orderShippingMethodAdjustment.shipping_method_id, shippingMethodIds))
  return groupBy(rows, "shipping_method_id")
}

// ─────────────────────────────────────────────────────────────────────────────
// 对外 API
// ─────────────────────────────────────────────────────────────────────────────

function withAggregateStatus(
  orderRow: OrderRow,
  bundle: OrderRelationsBundle,
): OrderStatusInput & Record<string, unknown> {
  const payment_collections = bundle.paymentCollectionsByOrder.get(orderRow.id) ?? []
  const fulfillments = bundle.fulfillmentsByOrder.get(orderRow.id) ?? []
  const items = bundle.itemsByOrder.get(orderRow.id) ?? []
  const statusInput = toOrderStatusInput(orderRow, { payment_collections, fulfillments, items })

  return {
    ...orderRow,
    payment_collections,
    fulfillments,
    payment_status: getLastPaymentStatus(statusInput),
    fulfillment_status: getLastFulfillmentStatus(statusInput),
  }
}

function withOptionalRelations(
  order: Record<string, unknown>,
  orderRow: OrderRow,
  bundle: OrderRelationsBundle,
  fieldConfig: OrderFieldsConfig,
) {
  return {
    ...order,
    ...(fieldConfig.wantsCustomer
      ? {
          customer: orderRow.customer_id
            ? bundle.customersById.get(orderRow.customer_id) ?? null
            : null,
        }
      : {}),
    ...(fieldConfig.wantsSalesChannel
      ? {
          sales_channel: orderRow.sales_channel_id
            ? bundle.salesChannelsById.get(orderRow.sales_channel_id) ?? null
            : null,
        }
      : {}),
  }
}

/** 列表 */
export async function presentAdminOrders(
  db: Db,
  orders: OrderRow[],
  options: PresentAdminOrdersOptions = {},
) {
  if (orders.length === 0) return []

  const fieldConfig = resolveOrderFieldsConfig(options.fields)
  const bundle = await loadRelations(db, orders, fieldConfig)

  return orders.map((orderRow) => {
    const summaryRow = bundle.summariesByOrder.get(orderRow.id) ?? null
    let dto = withOptionalRelations(
      withAggregateStatus(orderRow, bundle),
      orderRow,
      bundle,
      fieldConfig,
    )

    if (fieldConfig.wantsSummary) {
      dto = formatAdminOrder({ order: dto as any, summaryRow }) as any
    } else if (fieldConfig.wantsTotal) {
      dto = { ...dto, total: extractOrderTotal(summaryRow) } as any
    }

    return applyOrderFieldMask(dto, fieldConfig)
  })
}

function presentAdminOrderDetailScalars(
  orderRow: OrderRow,
  fieldConfig: OrderFieldsConfig,
) {
  const out: Record<string, unknown> = { id: orderRow.id }
  for (const field of fieldConfig.fields) {
    const key = field.startsWith("+") ? field.slice(1) : field
    if (key in orderRow) {
      out[key] = (orderRow as Record<string, unknown>)[key]
    }
  }
  return applyOrderFieldMask(out, fieldConfig)
}

async function loadPresentedAdminOrderDetail(
  db: Db,
  orderRow: OrderRow,
  fieldConfig: OrderFieldsConfig,
) {
  const bundle = await loadRelations(db, [orderRow], fieldConfig)
  const lineItemRows = await loadDetailLineItems(db, orderRow.id)
  const shippingRows = await loadDetailShipping(db, orderRow.id)
  const shippingAddress = orderRow.shipping_address_id
    ? (await db.select().from(orderAddress).where(eq(orderAddress.id, orderRow.shipping_address_id)).limit(1))[0] ?? null
    : null
  const billingAddress = orderRow.billing_address_id
    ? (await db.select().from(orderAddress).where(eq(orderAddress.id, orderRow.billing_address_id)).limit(1))[0] ?? null
    : null
  const creditLines = await db
    .select()
    .from(orderCreditLine)
    .where(eq(orderCreditLine.order_id, orderRow.id))
  const promotionsResult = await db.execute(sql`
      SELECT p.id, p.code, p.type, p.status, p.is_automatic, p.is_tax_inclusive, p.limit, p.used, p.campaign_id, p.metadata
      FROM order_promotion op
      INNER JOIN promotion p ON p.id = op.promotion_id
      WHERE op.order_id = ${orderRow.id} AND op.deleted_at IS NULL AND p.deleted_at IS NULL
    `)
  const promotions = (promotionsResult.rows ?? promotionsResult) as any[]
  const orderRegion = orderRow.region_id
    ? (await db.select().from(region).where(eq(region.id, orderRow.region_id)).limit(1))[0] ?? null
    : null

  const lineItemIds = lineItemRows.map((r) => r.lineItem.id)
  const shippingIds = shippingRows.map((r) => r.shippingMethod.id)

  const taxLinesByLineItemId = await loadLineItemTaxLines(db, lineItemIds)
  const adjustmentsByLineItemId = await loadLineItemAdjustments(db, lineItemIds)
  const shippingTaxByMethodId = await loadShippingTaxLines(db, shippingIds)
  const shippingAdjByMethodId = await loadShippingAdjustments(db, shippingIds)

  const variantIds = [...new Set(lineItemRows.map(r => r.variant?.id).filter(Boolean) as string[])]
  const inventoryItemsByVariant = new Map<string, any[]>()
  if (variantIds.length > 0) {
    const iiRows = await db.execute(sql`
      SELECT id, variant_id, inventory_item_id, required_quantity, created_at, updated_at, deleted_at
      FROM product_variant_inventory_item
      WHERE variant_id IN (${sql.join(variantIds.map(id => sql`${id}`), sql`,`)})
        AND deleted_at IS NULL
    `)
    for (const row of (iiRows.rows ?? iiRows) as any[]) {
      const existing = inventoryItemsByVariant.get(row.variant_id) ?? []
      existing.push({ id: row.id, inventory_item_id: row.inventory_item_id, required_quantity: row.required_quantity })
      inventoryItemsByVariant.set(row.variant_id, existing)
    }
  }

  const summaryRow = bundle.summariesByOrder.get(orderRow.id) ?? null
  const dto = formatAdminOrder({
    order: withOptionalRelations(
      withAggregateStatus(orderRow, bundle),
      orderRow,
      bundle,
      fieldConfig,
    ),
    summaryRow,
    lineItemRows,
    shippingRows,
    taxLinesByLineItemId,
    adjustmentsByLineItemId,
    shippingTaxByMethodId,
    shippingAdjByMethodId,
    inventoryItemsByVariant,
  } as any)

  const dtoWithRelations = {
    ...dto,
    shipping_address: shippingAddress,
    billing_address: billingAddress,
    credit_lines: creditLines,
    promotions: promotions,
    region: orderRegion,
  }

  return applyOrderFieldMask(dtoWithRelations, fieldConfig)
}

/** 详情 */
export async function presentAdminOrderDetail(
  db: Db,
  orderRow: OrderRow,
  fields?: string,
) {
  const fieldConfig = resolveOrderFieldsConfig(fields ?? DEFAULT_ADMIN_ORDER_RETRIEVE_FIELDS)

  if (!needsFullOrderDetailLoad(fieldConfig)) {
    return presentAdminOrderDetailScalars(orderRow, fieldConfig)
  }

  return db.transaction((tx) =>
    loadPresentedAdminOrderDetail(tx as Db, orderRow, fieldConfig),
  )
}

// 单测用导出
export {
  parseSummaryTotals as toAdminOrderSummary,
  applyRootTotals as applyOrderRootTotals,
  formatLineItem as toAdminOrderLineItem,
  decorateOrderTotals,
  ORDER_ROOT_TOTAL_KEYS,
}
