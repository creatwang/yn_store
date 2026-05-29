import { describe, expect, it } from "vitest"
import {
  applyOrderRootTotals,
  decorateOrderTotals,
  toAdminOrderLineItem,
  toAdminOrderSummary,
} from "../../../src/services/order/admin-order"

describe("toAdminOrderSummary", () => {
  it("无 order_summary 时返回带 pending_difference 的默认对象", () => {
    const summary = toAdminOrderSummary(null)
    expect(summary.pending_difference).toBe(0)
    expect(summary.transaction_total).toBe(0)
    expect(summary.total).toBe(0)
  })

  it("展平 totals 并解析金额字段", () => {
    const summary = toAdminOrderSummary({
      totals: {
        total: { value: "1000", precision: 2 },
        pending_difference: "50",
        transaction_total: 950,
        item_subtotal: "800",
      },
    })

    expect(summary.total).toBe(1000)
    expect(summary.pending_difference).toBe(50)
    expect(summary.item_subtotal).toBe(800)
  })
})

describe("applyOrderRootTotals", () => {
  it("把 summary 金额字段挂到 order 根上", () => {
    const summary = toAdminOrderSummary({
      totals: {
        total: 1000,
        item_subtotal: 800,
        shipping_subtotal: 100,
        tax_total: 100,
        pending_difference: 0,
        transaction_total: 1000,
      },
    })

    const order = applyOrderRootTotals({ id: "order_1" }, summary)

    expect(order.total).toBe(1000)
    expect(order.item_subtotal).toBe(800)
    expect(order.summary.pending_difference).toBe(0)
  })
})

describe("decorateOrderTotals", () => {
  it("从 items 计算订单级金额", () => {
    const order = decorateOrderTotals({
      id: "order_1",
      currency_code: "USD",
      summary: { transaction_total: 0 },
      items: [
        {
          id: "li_1",
          title: "A",
          unit_price: 100,
          quantity: 2,
          is_tax_inclusive: false,
          tax_lines: [{ rate: 10 }],
          adjustments: [],
          detail: { fulfilled_quantity: 0, quantity: 2 },
        },
      ],
      shipping_methods: [],
    })

    expect(order.item_subtotal).toBe(200)
    expect(order.tax_total).toBe(20)
    expect(order.total).toBe(220)
  })
})

describe("toAdminOrderLineItem", () => {
  it("合并 line_item 与 order_item.detail", () => {
    const item = toAdminOrderLineItem({
      orderItem: {
        id: "orditem_1",
        version: 1,
        item_id: "ordli_1",
        order_id: "order_1",
        quantity: "2",
        raw_quantity: { value: "2", precision: 0 },
        fulfilled_quantity: "1",
        raw_fulfilled_quantity: { value: "1", precision: 0 },
        unit_price: "500",
        raw_unit_price: { value: "500", precision: 2 },
        compare_at_unit_price: null,
        raw_compare_at_unit_price: null,
        delivered_quantity: "0",
        raw_delivered_quantity: null,
        shipped_quantity: "0",
        raw_shipped_quantity: null,
        return_requested_quantity: "0",
        return_received_quantity: "0",
        return_dismissed_quantity: "0",
        written_off_quantity: "0",
        metadata: null,
      },
      lineItem: {
        id: "ordli_1",
        title: "Test",
        subtitle: null,
        thumbnail: null,
        variant_id: "variant_1",
        product_id: "prod_1",
        product_title: "Product",
        product_description: null,
        product_subtitle: null,
        product_type: null,
        product_type_id: null,
        product_collection: null,
        product_handle: null,
        variant_sku: null,
        variant_barcode: null,
        variant_title: null,
        variant_option_values: null,
        requires_shipping: true,
        is_giftcard: false,
        is_discountable: true,
        is_tax_inclusive: false,
        compare_at_unit_price: null,
        raw_compare_at_unit_price: null,
        unit_price: "500",
        raw_unit_price: { value: "500", precision: 2 },
        is_custom_price: false,
        metadata: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    })

    expect(item.id).toBe("ordli_1")
    expect(item.quantity).toBe(2)
    expect(item.unit_price).toBe(500)
    expect(item.detail.fulfilled_quantity).toBe(1)
  })
})
