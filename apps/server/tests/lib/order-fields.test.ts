import { describe, expect, it } from "vitest"
import {
  applyOrderFieldMask,
  resolveOrderFieldsConfig,
} from "../../src/lib/order-fields"

describe("order fields", () => {
  it("识别 payment_collections / fulfillments 关联请求", () => {
    const config = resolveOrderFieldsConfig(
      "id,payment_status,*payment_collections,*customer",
    )

    expect(config.wantsPaymentCollections).toBe(true)
    expect(config.wantsFulfillments).toBe(false)
    expect(config.wantsCustomer).toBe(true)
  })

  it("算完状态后剥离未请求的关联（对齐 get-orders-list workflow）", () => {
    const config = resolveOrderFieldsConfig(
      "id,payment_status,fulfillment_status,*payment_collections",
    )

    const masked = applyOrderFieldMask(
      {
        id: "order_1",
        payment_status: "not_paid",
        fulfillment_status: "not_fulfilled",
        payment_collections: [{ id: "pc_1" }],
        fulfillments: [{ id: "ful_1" }],
        customer: { id: "cus_1" },
      },
      config,
    )

    expect(masked.payment_collections).toEqual([{ id: "pc_1" }])
    expect(masked.fulfillments).toBeUndefined()
    expect(masked.customer).toBeUndefined()
    expect(masked.payment_status).toBe("not_paid")
  })
})
