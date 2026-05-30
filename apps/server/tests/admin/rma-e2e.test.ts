/**
 * RMA 端到端 API 冒烟 — 退货 / 换货 / 索赔 + order preview
 */
import { describe, it, expect } from "vitest"
import { apiGet, apiPost, apiPostRetry } from "../setup"

async function createOrder() {
  const res = await apiPostRetry("/admin/orders", {
    email: `rma_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
    currency_code: "USD",
  })
  const body = await res.json()
  return body.order.id as string
}

describe("Admin RMA 端到端", () => {
  it("GET /admin/orders/:id/preview — 无变更时含 items", async () => {
    const orderId = await createOrder()
    const res = await apiGet(`/admin/orders/${orderId}/preview`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.order?.id).toBe(orderId)
    expect(body.order?.items).toBeInstanceOf(Array)
  })

  it("退货 — 创建后 preview 含 order_change.return_request", async () => {
    const orderId = await createOrder()
    const created = await apiPost("/admin/returns", { order_id: orderId })
    expect(created.status).toBe(201)
    const { return: ret } = await created.json()

    const preview = await (await apiGet(`/admin/orders/${orderId}/preview`)).json()
    expect(preview.order?.order_change?.change_type).toBe("return_request")
    expect(preview.order?.order_change?.return_id).toBe(ret.id)
  })

  it("换货 — 创建后含 exchange change + return_id", async () => {
    const orderId = await createOrder()
    const res = await apiPost("/admin/exchanges", { order_id: orderId })
    expect(res.status).toBe(201)
    const { exchange } = await res.json()
    expect(exchange.return_id).toMatch(/^ret_/)

    const preview = await (await apiGet(`/admin/orders/${orderId}/preview`)).json()
    expect(preview.order?.order_change?.change_type).toBe("exchange")
    expect(preview.order?.order_change?.exchange_id).toBe(exchange.id)
  })

  it("索赔 — 创建后含 claim change + return_id", async () => {
    const orderId = await createOrder()
    const res = await apiPost("/admin/claims", {
      order_id: orderId,
      type: "replace",
    })
    expect(res.status).toBe(201)
    const { claim } = await res.json()
    expect(claim.return_id).toMatch(/^ret_/)

    const preview = await (await apiGet(`/admin/orders/${orderId}/preview`)).json()
    expect(preview.order?.order_change?.change_type).toBe("claim")
    expect(preview.order?.order_change?.claim_id).toBe(claim.id)
  })
})
