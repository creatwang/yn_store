import { toAmount } from "../../lib/math/big-number"
import type {
  AdminOrderSummaryDto,
  OrderLineItemJoinRow,
  OrderLineItemTaxLineRow,
  OrderShippingJoinRow,
  OrderSummaryRow,
} from "./types"
import { extractOrderTotal } from "./aggregate-status"

const SUMMARY_DEFAULTS: AdminOrderSummaryDto = {
  total: 0,
  subtotal: 0,
  tax_total: 0,
  discount_total: 0,
  shipping_total: 0,
  transaction_total: 0,
  pending_difference: 0,
}

/** 对齐 Admin DEFAULT_FIELDS 与 decorateCartTotals 写入 order 根的金额字段 */
export const ORDER_ROOT_TOTAL_KEYS = [
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
  "fulfilled_total",
  "shipped_total",
  "return_requested_total",
  "return_received_total",
  "transaction_total",
] as const

type OrderItemRow = OrderLineItemJoinRow["orderItem"]

/** order_summary.totals JSON → AdminOrder.summary DTO */
export function toAdminOrderSummary(
  summaryRow: Pick<OrderSummaryRow, "totals"> | null | undefined,
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

export function toAdminOrderTotal(
  summaryRow: Pick<OrderSummaryRow, "totals"> | null | undefined,
): number {
  return extractOrderTotal(summaryRow)
}

/** 对齐 formatOrder + decorateCartTotals：把 summary 金额字段挂到 order 根上 */
export function applyOrderRootTotals<T extends Record<string, unknown>>(
  order: T,
  summary: AdminOrderSummaryDto,
): T {
  const rootTotals: Record<string, unknown> = {}

  for (const key of ORDER_ROOT_TOTAL_KEYS) {
    if (summary[key] !== undefined) {
      rootTotals[key] = summary[key]
    }
  }

  return {
    ...order,
    ...rootTotals,
    total: summary.total,
    summary,
  }
}

function toAdminOrderItemDetail(row: OrderItemRow) {
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
    raw_shipped_quantity: row.raw_shipped_quantity,
    delivered_quantity: toAmount(row.delivered_quantity ?? row.raw_delivered_quantity),
    raw_delivered_quantity: row.raw_delivered_quantity,
    unit_price: toAmount(row.unit_price ?? row.raw_unit_price),
    raw_unit_price: row.raw_unit_price,
    compare_at_unit_price: toAmount(
      row.compare_at_unit_price ?? row.raw_compare_at_unit_price,
    ),
    raw_compare_at_unit_price: row.raw_compare_at_unit_price,
    metadata: row.metadata,
  }
}

function toAdminTaxLine(row: OrderLineItemTaxLineRow, itemSubtotal: number) {
  const rate = toAmount(row.rate ?? row.raw_rate)
  return {
    ...row,
    rate,
    subtotal: itemSubtotal > 0 ? (itemSubtotal * rate) / 100 : 0,
  }
}

/** 对齐 @medusajs/order formatOrder 的 items 整形 */
export function toAdminOrderLineItem(
  row: OrderLineItemJoinRow,
  taxLines: OrderLineItemTaxLineRow[] = [],
) {
  const { orderItem: detailRow, lineItem } = row
  const detail = toAdminOrderItemDetail(detailRow)
  const unitPrice = toAmount(
    detailRow.unit_price ?? detailRow.raw_unit_price ?? lineItem.unit_price ?? lineItem.raw_unit_price,
  )
  const quantity = detail.quantity
  const subtotal = unitPrice * quantity

  return {
    ...lineItem,
    unit_price: unitPrice,
    compare_at_unit_price: toAmount(
      detailRow.compare_at_unit_price ??
        detailRow.raw_compare_at_unit_price ??
        lineItem.compare_at_unit_price ??
        lineItem.raw_compare_at_unit_price,
    ),
    quantity,
    raw_quantity: detailRow.raw_quantity,
    metadata: detailRow.metadata ?? lineItem.metadata,
    subtotal,
    detail,
    tax_lines: taxLines.map((line) => toAdminTaxLine(line, subtotal)),
    adjustments: [],
  }
}

export function toAdminOrderLineItems(
  rows: OrderLineItemJoinRow[],
  taxLinesByLineItemId: Map<string, OrderLineItemTaxLineRow[]> = new Map(),
) {
  return rows.map((row) =>
    toAdminOrderLineItem(row, taxLinesByLineItemId.get(row.lineItem.id) ?? []),
  )
}

/** 对齐 formatOrder 的 shipping_methods 整形 */
export function toAdminOrderShippingMethod(row: OrderShippingJoinRow) {
  const { link, shippingMethod } = row

  return {
    ...shippingMethod,
    amount: toAmount(shippingMethod.amount ?? shippingMethod.raw_amount),
    order_id: link.order_id,
    detail: {
      id: link.id,
      order_id: link.order_id,
      shipping_method_id: link.shipping_method_id,
      version: link.version,
    },
    tax_lines: [],
    adjustments: [],
  }
}

export function toAdminOrderShippingMethods(rows: OrderShippingJoinRow[]) {
  return rows.map(toAdminOrderShippingMethod)
}

export type ToAdminOrderDtoInput = {
  order: Record<string, unknown>
  summaryRow: Pick<OrderSummaryRow, "totals"> | null | undefined
  lineItems?: OrderLineItemJoinRow[]
  shippingMethods?: OrderShippingJoinRow[]
  taxLinesByLineItemId?: Map<string, OrderLineItemTaxLineRow[]>
  includeRootTotals?: boolean
}

/** 单一入口：DB 订单 + 关联 → Admin API DTO 形状 */
export function toAdminOrderDto(input: ToAdminOrderDtoInput) {
  const summary = toAdminOrderSummary(input.summaryRow)
  const base = {
    ...input.order,
    total: summary.total,
    summary,
  }

  const withTotals =
    input.includeRootTotals === false
      ? base
      : applyOrderRootTotals(base, summary)

  return {
    ...withTotals,
    ...(input.lineItems
      ? {
          items: toAdminOrderLineItems(
            input.lineItems,
            input.taxLinesByLineItemId,
          ),
        }
      : {}),
    ...(input.shippingMethods
      ? { shipping_methods: toAdminOrderShippingMethods(input.shippingMethods) }
      : {}),
  }
}
