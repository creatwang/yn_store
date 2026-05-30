/**
 * 对齐 Medusa v2.15.3 core-flows/order/utils/aggregate-status.ts
 */
import { bn, getCurrencyEpsilon, toAmount } from "../../lib/big-number"
import type {
  FulfillmentForStatus,
  OrderItemForStatus,
  OrderStatusInput,
  PaymentCollectionForStatus,
} from "./types"

const PaymentStatus = {
  NOT_PAID: "not_paid",
  AWAITING: "awaiting",
  CAPTURED: "captured",
  PARTIALLY_CAPTURED: "partially_captured",
  PARTIALLY_REFUNDED: "partially_refunded",
  REFUNDED: "refunded",
  CANCELED: "canceled",
  REQUIRES_ACTION: "requires_action",
  AUTHORIZED: "authorized",
  PARTIALLY_AUTHORIZED: "partially_authorized",
} as const

const FulfillmentStatus = {
  NOT_FULFILLED: "not_fulfilled",
  PARTIALLY_FULFILLED: "partially_fulfilled",
  FULFILLED: "fulfilled",
  PARTIALLY_SHIPPED: "partially_shipped",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  PARTIALLY_DELIVERED: "partially_delivered",
  CANCELED: "canceled",
} as const

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

export function getLastPaymentStatus(order: OrderStatusInput): string {
  const currencyEpsilon = getCurrencyEpsilon(order.currency_code)
  const paymentStatus: Record<string, number> = {}

  for (const status of Object.values(PaymentStatus)) {
    paymentStatus[status] = 0
  }

  for (const paymentCollection of order.payment_collections ?? []) {
    if (
      bn.gt(paymentCollection.captured_amount, 0) ||
      (isDefined(paymentCollection.amount) && bn.eq(paymentCollection.amount, 0))
    ) {
      const isGte = bn.lte(
        bn.sub(paymentCollection.amount, paymentCollection.captured_amount),
        currencyEpsilon,
      )
      paymentStatus[PaymentStatus.CAPTURED] += isGte ? 1 : 0.5
    }

    if (bn.gt(paymentCollection.refunded_amount, 0)) {
      const isGte = bn.lte(
        bn.sub(paymentCollection.amount, paymentCollection.refunded_amount),
        currencyEpsilon,
      )
      paymentStatus[PaymentStatus.REFUNDED] += isGte ? 1 : 0.5
    }

    paymentStatus[paymentCollection.status as string] += 1
  }

  const totalPayments = order.payment_collections?.length ?? 0
  const totalPaymentExceptCanceled =
    totalPayments - paymentStatus[PaymentStatus.CANCELED]

  if (paymentStatus[PaymentStatus.REQUIRES_ACTION] > 0) {
    return PaymentStatus.REQUIRES_ACTION
  }

  if (paymentStatus[PaymentStatus.REFUNDED] > 0) {
    if (paymentStatus[PaymentStatus.REFUNDED] === paymentStatus[PaymentStatus.CAPTURED]) {
      return PaymentStatus.REFUNDED
    }
    return PaymentStatus.PARTIALLY_REFUNDED
  }

  if (paymentStatus[PaymentStatus.CAPTURED] > 0) {
    if (paymentStatus[PaymentStatus.CAPTURED] === totalPaymentExceptCanceled) {
      return PaymentStatus.CAPTURED
    }
    return PaymentStatus.PARTIALLY_CAPTURED
  }

  if (paymentStatus[PaymentStatus.AUTHORIZED] > 0) {
    if (paymentStatus[PaymentStatus.AUTHORIZED] === totalPaymentExceptCanceled) {
      return PaymentStatus.AUTHORIZED
    }
    return PaymentStatus.PARTIALLY_AUTHORIZED
  }

  if (
    paymentStatus[PaymentStatus.CANCELED] > 0 &&
    paymentStatus[PaymentStatus.CANCELED] === totalPayments
  ) {
    return PaymentStatus.CANCELED
  }

  if (paymentStatus[PaymentStatus.AWAITING] > 0) {
    return PaymentStatus.AWAITING
  }

  return PaymentStatus.NOT_PAID
}

export function getLastFulfillmentStatus(order: OrderStatusInput): string {
  const fulfillmentStatus: Record<string, number> = {}

  for (const status of Object.values(FulfillmentStatus)) {
    fulfillmentStatus[status] = 0
  }

  const statusMap: Record<string, string> = {
    canceled_at: FulfillmentStatus.CANCELED,
    delivered_at: FulfillmentStatus.DELIVERED,
    shipped_at: FulfillmentStatus.SHIPPED,
    packed_at: FulfillmentStatus.FULFILLED,
  }

  for (const fulfillmentCollection of order.fulfillments ?? []) {
    for (const key of Object.keys(statusMap)) {
      if ((fulfillmentCollection as Record<string, unknown>)[key]) {
        fulfillmentStatus[statusMap[key]] += 1
        break
      }
    }
  }

  const totalFulfillments = order.fulfillments?.length ?? 0
  const totalFulfillmentsExceptCanceled =
    totalFulfillments - fulfillmentStatus[FulfillmentStatus.CANCELED]

  const hasUnfulfilledItems =
    (order.items ?? []).filter(
      (i) =>
        isDefined(i?.detail?.raw_fulfilled_quantity) &&
        bn.lt(i.detail!.raw_fulfilled_quantity, i.raw_quantity),
    ).length > 0

  if (fulfillmentStatus[FulfillmentStatus.DELIVERED] > 0) {
    if (
      fulfillmentStatus[FulfillmentStatus.DELIVERED] === totalFulfillmentsExceptCanceled &&
      !hasUnfulfilledItems
    ) {
      return FulfillmentStatus.DELIVERED
    }
    return FulfillmentStatus.PARTIALLY_DELIVERED
  }

  if (fulfillmentStatus[FulfillmentStatus.SHIPPED] > 0) {
    if (
      fulfillmentStatus[FulfillmentStatus.SHIPPED] === totalFulfillmentsExceptCanceled &&
      !hasUnfulfilledItems
    ) {
      return FulfillmentStatus.SHIPPED
    }
    return FulfillmentStatus.PARTIALLY_SHIPPED
  }

  if (fulfillmentStatus[FulfillmentStatus.FULFILLED] > 0) {
    if (
      fulfillmentStatus[FulfillmentStatus.FULFILLED] === totalFulfillmentsExceptCanceled &&
      !hasUnfulfilledItems
    ) {
      return FulfillmentStatus.FULFILLED
    }
    return FulfillmentStatus.PARTIALLY_FULFILLED
  }

  if (
    fulfillmentStatus[FulfillmentStatus.CANCELED] > 0 &&
    fulfillmentStatus[FulfillmentStatus.CANCELED] === totalFulfillments
  ) {
    return FulfillmentStatus.CANCELED
  }

  return FulfillmentStatus.NOT_FULFILLED
}

export function extractOrderTotal(summary: { totals: unknown } | null | undefined): number {
  if (!summary?.totals || typeof summary.totals !== "object") {
    return 0
  }

  const totals = summary.totals as Record<string, unknown>
  return toAmount(
    totals.total ?? totals.original_total ?? totals.original_order_total,
  )
}

export function toOrderStatusInput(
  orderRow: { currency_code: string },
  relations: {
    payment_collections: PaymentCollectionForStatus[]
    fulfillments: FulfillmentForStatus[]
    items: OrderItemForStatus[]
  },
): OrderStatusInput {
  return {
    currency_code: orderRow.currency_code,
    payment_collections: relations.payment_collections,
    fulfillments: relations.fulfillments,
    items: relations.items,
  }
}
