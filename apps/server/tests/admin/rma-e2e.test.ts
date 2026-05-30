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

async function createOrderWithLineItem() {
  const pr = await apiPostRetry("/admin/products", { title: `RMA_${Date.now()}` })
  const productId = (await pr.json()).product.id as string
  const vr = await apiPost(`/admin/products/${productId}/variants`, {
    title: "Default",
    sku: `RMA_${Date.now()}`,
  })
  const variantId = (await vr.json()).variant.id as string

  const orderId = await createOrder()
  const addRes = await apiPost(`/admin/orders/${orderId}/line-items`, {
    variant_id: variantId,
    quantity: 2,
    unit_price: 10,
  })
  expect(addRes.status).toBe(201)
  const { line_item } = await addRes.json()
  return { orderId, lineItemId: line_item.id as string }
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

  it("退货 — 添加 request-items 后 preview items 含 RETURN_ITEM action", async () => {
    const { orderId, lineItemId } = await createOrderWithLineItem()
    const created = await apiPost("/admin/returns", { order_id: orderId })
    expect(created.status).toBe(201)
    const { return: ret } = await created.json()

    const addItems = await apiPost(`/admin/returns/${ret.id}/request-items`, {
      items: [{ item_id: lineItemId, quantity: 1 }],
    })
    expect(addItems.status).toBe(200)

    const preview = await (await apiGet(`/admin/orders/${orderId}/preview`)).json()
    const line = preview.order?.items?.find((i: { id: string }) => i.id === lineItemId)
    expect(line).toBeDefined()
    expect(line.actions?.some((a: { action: string }) => a.action === "RETURN_ITEM")).toBe(true)
    expect(line.detail?.return_requested_quantity).toBe(1)
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

  it("索赔 — inbound items 后 preview 含 RETURN_ITEM action", async () => {
    const { orderId, lineItemId } = await createOrderWithLineItem()
    const created = await apiPost("/admin/claims", {
      order_id: orderId,
      type: "replace",
    })
    expect(created.status).toBe(201)
    const { claim } = await created.json()

    const addItems = await apiPost(`/admin/claims/${claim.id}/inbound/items`, {
      items: [{ item_id: lineItemId, quantity: 1 }],
    })
    expect(addItems.status).toBe(200)

    const preview = await (await apiGet(`/admin/orders/${orderId}/preview`)).json()
    const line = preview.order?.items?.find((i: { id: string }) => i.id === lineItemId)
    expect(line).toBeDefined()
    expect(line.actions?.some((a: { action: string; claim_id?: string }) => a.action === "RETURN_ITEM" && a.claim_id === claim.id)).toBe(true)
  })

  it("退货 — initiate receive 后 preview 含 return_receive", async () => {
    const { orderId, lineItemId } = await createOrderWithLineItem()
    const created = await apiPost("/admin/returns", { order_id: orderId })
    const { return: ret } = await created.json()
    await apiPost(`/admin/returns/${ret.id}/request-items`, {
      items: [{ item_id: lineItemId, quantity: 1 }],
    })
    await apiPost(`/admin/returns/${ret.id}/request`, {})

    const receive = await apiPost(`/admin/returns/${ret.id}/receive`)
    expect(receive.status).toBe(200)

    const preview = await (await apiGet(`/admin/orders/${orderId}/preview`)).json()
    expect(preview.order?.order_change?.change_type).toBe("return_receive")
    expect(preview.order?.order_change?.return_id).toBe(ret.id)
  })
})
