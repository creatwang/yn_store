/**
 * 订单编辑 API 冒烟测试
 */
import { describe, it, expect, beforeAll } from "vitest"
import { apiGet, apiPost, apiPostRetry, apiDelete } from "../setup"

describe("Admin 订单编辑 API", () => {
  let orderId: string

  beforeAll(async () => {
    const res = await apiPostRetry("/admin/orders", {
      email: `edit_${Date.now()}@test.com`,
      currency_code: "USD",
    })
    orderId = (await res.json()).order.id
  })

  it("POST /admin/order-edits — 创建编辑", async () => {
    const res = await apiPost("/admin/order-edits", { order_id: orderId })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.order_edit?.id).toBeTruthy()
  })

  it("GET /admin/order-edits/:id — 详情", async () => {
    const created = await apiPost("/admin/order-edits", { order_id: orderId })
    const editId = (await created.json()).order_edit.id
    const res = await apiGet(`/admin/order-edits/${editId}`)
    expect(res.status).toBe(200)
  })

  it("DELETE /admin/order-edits/:id — 取消编辑", async () => {
    const created = await apiPost("/admin/order-edits", { order_id: orderId })
    const editId = (await created.json()).order_edit.id
    const res = await apiDelete(`/admin/order-edits/${editId}`)
    expect(res.status).toBe(200)
  })

  it("POST items + confirm — 加品并确认（对齐官方 request→confirm）", async () => {
    const variants = await (
      await apiGet("/admin/product-variants", { limit: "1", fields: "id" })
    ).json()
    const variantId = variants.variants?.[0]?.id as string | undefined
    expect(variantId).toBeTruthy()

    const created = await apiPost("/admin/order-edits", { order_id: orderId })
    expect(created.status).toBe(201)
    const editId = (await created.json()).order_edit.id as string

    const addRes = await apiPost(`/admin/order-edits/${editId}/items`, {
      items: [{ variant_id: variantId, quantity: 1 }],
    })
    expect(addRes.status).toBe(200)

    const reqRes = await apiPost(`/admin/order-edits/${editId}/request`, {
      internal_note: "test confirm",
      send_notification: false,
    })
    expect(reqRes.status).toBe(200)

    const confirmRes = await apiPost(`/admin/order-edits/${editId}/confirm`)
    const confirmBody = await confirmRes.json()
    if (confirmRes.status >= 500) {
      console.error("confirm failed", confirmBody)
    }
    expect(confirmRes.status, JSON.stringify(confirmBody)).toBe(200)
    expect(confirmBody.order?.items?.length).toBeGreaterThan(0)
  })
})
