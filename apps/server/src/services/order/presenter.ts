import { getDb } from "@my-store/db"
import {
  getLastFulfillmentStatus,
  getLastPaymentStatus,
  toOrderStatusInput,
} from "./aggregate-status"
import {
  applyOrderFieldMask,
  DEFAULT_ADMIN_ORDER_RETRIEVE_FIELDS,
  resolveOrderFieldsConfig,
  type OrderFieldsConfig,
} from "./fields"
import {
  loadOrderDetailLineItems,
  loadOrderDetailShippingMethods,
  loadOrderLineItemTaxLinesByLineItemIds,
  loadOrderRelations,
} from "./relations"
import {
  applyOrderRootTotals,
  toAdminOrderDto,
  toAdminOrderSummary,
  toAdminOrderTotal,
} from "./transform"
import type { OrderRelationsBundle, OrderRow } from "./types"

type Db = ReturnType<typeof getDb>

export type PresentAdminOrdersOptions = {
  fields?: string
}

function toAdminOrder(
  orderRow: OrderRow,
  bundle: OrderRelationsBundle,
  fieldConfig: OrderFieldsConfig,
) {
  const payment_collections =
    bundle.paymentCollectionsByOrder.get(orderRow.id) ?? []
  const fulfillments = bundle.fulfillmentsByOrder.get(orderRow.id) ?? []
  const items = bundle.itemsByOrder.get(orderRow.id) ?? []
  const summaryRow = bundle.summariesByOrder.get(orderRow.id) ?? null
  const statusInput = toOrderStatusInput(orderRow, {
    payment_collections,
    fulfillments,
    items,
  })

  const summary = toAdminOrderSummary(summaryRow)
  const presented = {
    ...orderRow,
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
    payment_collections,
    fulfillments,
    ...(fieldConfig.wantsSummary
      ? applyOrderRootTotals({ summary }, summary)
      : {}),
    ...(fieldConfig.wantsTotal && !fieldConfig.wantsSummary
      ? { total: toAdminOrderTotal(summaryRow) }
      : {}),
    payment_status: getLastPaymentStatus(statusInput),
    fulfillment_status: getLastFulfillmentStatus(statusInput),
  }

  return applyOrderFieldMask(presented, fieldConfig)
}

/** 列表 / 批量：DB 行 → Admin API 订单 DTO */
export async function presentAdminOrders(
  db: Db,
  orders: OrderRow[],
  options: PresentAdminOrdersOptions = {},
) {
  if (orders.length === 0) return []

  const fieldConfig = resolveOrderFieldsConfig(options.fields)
  const bundle = await loadOrderRelations(db, orders, fieldConfig)

  return orders.map((orderRow) => toAdminOrder(orderRow, bundle, fieldConfig))
}

/** 详情：加载关联并 formatOrder 整形为 Admin DTO */
export async function presentAdminOrderDetail(
  db: Db,
  orderRow: OrderRow,
  fields?: string,
) {
  const fieldConfig = resolveOrderFieldsConfig(
    fields ?? DEFAULT_ADMIN_ORDER_RETRIEVE_FIELDS,
  )

  const bundle = await loadOrderRelations(db, [orderRow], fieldConfig)
  const lineItemRows = await loadOrderDetailLineItems(db, orderRow.id)
  const shippingMethodRows = await loadOrderDetailShippingMethods(db, orderRow.id)

  const taxLinesByLineItemId = await loadOrderLineItemTaxLinesByLineItemIds(
    db,
    lineItemRows.map((row) => row.lineItem.id),
  )

  const summaryRow = bundle.summariesByOrder.get(orderRow.id) ?? null
  const payment_collections =
    bundle.paymentCollectionsByOrder.get(orderRow.id) ?? []
  const fulfillments = bundle.fulfillmentsByOrder.get(orderRow.id) ?? []
  const statusItems = bundle.itemsByOrder.get(orderRow.id) ?? []
  const statusInput = toOrderStatusInput(orderRow, {
    payment_collections,
    fulfillments,
    items: statusItems,
  })

  const dto = toAdminOrderDto({
    order: {
      ...orderRow,
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
      payment_collections,
      fulfillments,
      payment_status: getLastPaymentStatus(statusInput),
      fulfillment_status: getLastFulfillmentStatus(statusInput),
    },
    summaryRow,
    lineItems: lineItemRows,
    shippingMethods: shippingMethodRows,
    taxLinesByLineItemId,
    includeRootTotals: true,
  })

  return applyOrderFieldMask(dto, fieldConfig)
}
