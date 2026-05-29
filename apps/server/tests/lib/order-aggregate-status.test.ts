import { describe, expect, it } from "vitest"
import {
  getLastFulfillmentStatus,
  getLastPaymentStatus,
} from "../../src/services/order/status"

describe("order aggregate status", () => {
  it("未关联支付集合时返回 not_paid", () => {
    expect(
      getLastPaymentStatus({
        currency_code: "usd",
        payment_collections: [],
      }),
    ).toBe("not_paid")
  })

  it("已全额捕获时返回 captured", () => {
    expect(
      getLastPaymentStatus({
        currency_code: "usd",
        payment_collections: [
          {
            amount: "100",
            captured_amount: "100",
            status: "completed",
          },
        ],
      }),
    ).toBe("captured")
  })

  it("无履约记录时返回 not_fulfilled", () => {
    expect(
      getLastFulfillmentStatus({
        currency_code: "usd",
        fulfillments: [],
        items: [],
      }),
    ).toBe("not_fulfilled")
  })

  it("全部发货且无未履约行项时返回 shipped", () => {
    expect(
      getLastFulfillmentStatus({
        currency_code: "usd",
        fulfillments: [{ shipped_at: new Date().toISOString() }],
        items: [
          {
            raw_quantity: { value: "1", precision: 20 },
            detail: {
              raw_fulfilled_quantity: { value: "1", precision: 20 },
            },
          },
        ],
      }),
    ).toBe("shipped")
  })
})
