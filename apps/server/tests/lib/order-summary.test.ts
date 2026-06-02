import { describe, expect, it } from "vitest"
import { formatAdminOrderSummary } from "../../src/lib/order-summary"

describe("formatAdminOrderSummary", () => {
  it("无 order_summary 时返回带 pending_difference 的默认对象", () => {
    const summary = formatAdminOrderSummary(null)
    expect(summary.pending_difference).toBe(0)
    expect(summary.transaction_total).toBe(0)
    expect(summary.total).toBe(0)
  })

  it("展平 totals 并解析金额字段", () => {
    const summary = formatAdminOrderSummary({
      totals: {
        total: { value: "1000", precision: 2 },
        pending_difference: "50",
        transaction_total: 950,
      },
    })

    expect(summary.total).toBe(1000)
    expect(summary.pending_difference).toBe(50)
    expect(summary.transaction_total).toBe(950)
  })
})
