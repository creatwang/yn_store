import type { orderItem, orderLineItem, orderLineItemTaxLine, orderShippingMethod } from "@my-store/db"

export type OrderRow = typeof import("@my-store/db").order.$inferSelect
export type OrderSummaryRow = typeof import("@my-store/db").orderSummary.$inferSelect
export type CustomerRow = typeof import("@my-store/db").customer.$inferSelect
export type SalesChannelRow = typeof import("@my-store/db").salesChannel.$inferSelect

export type OrderLineItemJoinRow = {
  orderItem: typeof orderItem.$inferSelect
  lineItem: typeof orderLineItem.$inferSelect
}

export type OrderShippingJoinRow = {
  link: {
    id: string
    order_id: string
    shipping_method_id: string
    version: number
  }
  shippingMethod: typeof orderShippingMethod.$inferSelect
}

export type OrderLineItemTaxLineRow = typeof orderLineItemTaxLine.$inferSelect

/** 对齐 Medusa AdminOrder.summary（transform-order 展平 totals 后） */
export type AdminOrderSummaryDto = {
  total: number
  subtotal: number
  tax_total: number
  discount_total: number
  shipping_total: number
  transaction_total: number
  pending_difference: number
  [key: string]: unknown
}

export type PaymentCollectionForStatus = {
  amount?: unknown
  captured_amount?: unknown
  refunded_amount?: unknown
  status?: string | null
}

export type FulfillmentForStatus = {
  canceled_at?: Date | string | null
  delivered_at?: Date | string | null
  shipped_at?: Date | string | null
  packed_at?: Date | string | null
}

export type OrderItemForStatus = {
  raw_quantity?: unknown
  detail?: {
    raw_fulfilled_quantity?: unknown
    fulfilled_quantity?: unknown
    quantity?: unknown
  }
}

export type OrderStatusInput = {
  currency_code: string
  payment_collections?: PaymentCollectionForStatus[]
  fulfillments?: FulfillmentForStatus[]
  items?: OrderItemForStatus[]
}

/** 批量 enrichment 时预加载的关联数据 */
export type OrderRelationsBundle = {
  paymentCollectionsByOrder: Map<string, PaymentCollectionForStatus[]>
  fulfillmentsByOrder: Map<string, FulfillmentForStatus[]>
  summariesByOrder: Map<string, OrderSummaryRow>
  itemsByOrder: Map<string, OrderItemForStatus[]>
  customersById: Map<string, CustomerRow>
  salesChannelsById: Map<string, SalesChannelRow>
}
