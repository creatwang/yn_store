/**
 * 退货 RMA API 冒烟测试
 */
import { describe, it, expect, beforeAll } from "vitest"
import { apiGet, apiPost, apiPostRetry } from "../setup"

describe("Admin 退货 API", () => {
  let orderId: string

  beforeAll(async () => {
    const res = await apiPostRetry("/admin/orders", {
      email: `return_${Date.now()}@test.com`,
      currency_code: "USD",
    })
    orderId = (await res.json()).order.id
  })

  it("GET /admin/returns — 列表", async () => {
    const res = await apiGet("/admin/returns", { limit: "5" })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.returns).toBeInstanceOf(Array)
  })

  it("POST /admin/returns — 创建退货", async () => {
    const res = await apiPost("/admin/returns", { order_id: orderId })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.return?.id).toMatch(/^ret_/)
    expect(body.return.order_id).toBe(orderId)
  })

  it("GET /admin/returns/:id — 详情", async () => {
    const created = await apiPost("/admin/returns", { order_id: orderId })
    const returnId = (await created.json()).return.id
    const res = await apiGet(`/admin/returns/${returnId}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.return.id).toBe(returnId)
  })

  it("POST /admin/returns/:id/cancel — 取消", async () => {
    const created = await apiPost("/admin/returns", { order_id: orderId })
    const returnId = (await created.json()).return.id
    const res = await apiPost(`/admin/returns/${returnId}/cancel`)
    expect(res.status).toBe(200)
  })
})
