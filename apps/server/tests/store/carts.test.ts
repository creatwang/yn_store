/**
 * Store 购物车 API 测试
 */
import { describe, it, expect, beforeAll } from "vitest"
import { storePost, storeGet, apiPost, apiPostRetry, apiDelete } from "../setup"
import { app } from "../../src/app"

describe("Store 购物车 API", () => {
  let variantId: string
  let productId: string
  let promoCode: string

  beforeAll(async () => {
    const r = await apiPostRetry("/admin/products", { title: `CartTest_${Date.now()}` })
    productId = (await r.json()).product.id
    const vr = await apiPost(`/admin/products/${productId}/variants`, {
      title: "Default",
      sku: `CART_${Date.now()}`,
    })
    variantId = (await vr.json()).variant.id

    // Create a test promotion for promo code tests
    const pr = await apiPost("/admin/promotions", {
      code: `TEST10_${Date.now()}`,
      type: "standard",
      status: "active",
      is_automatic: false,
      metadata: { application_type: "percentage", value: 10 },
    })
    promoCode = (await pr.json()).promotion.code
  })

  // ── Basic CRUD ──────────────────────────────────

  it("POST /store/carts — 创建购物车", async () => {
    const res = await storePost("/store/carts", { currency_code: "USD" })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.cart.id).toMatch(/^cart_/)
  })

  it("GET /store/carts/:id — 获取购物车", async () => {
    const created = await storePost("/store/carts", { currency_code: "USD" })
    const cartId = (await created.json()).cart.id
    const res = await storeGet(`/store/carts/${cartId}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cart.id).toBe(cartId)
    expect(body.items).toBeInstanceOf(Array)
  })

  it("POST /store/carts/:id/line-items — 添加商品行", async () => {
    const created = await storePost("/store/carts", { currency_code: "USD" })
    const cartId = (await created.json()).cart.id
    const res = await storePost(`/store/carts/${cartId}/line-items`, {
      variant_id: variantId,
      product_id: productId,
      quantity: 2,
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.item?.id).toMatch(/^line_/)
  })

  it("POST /store/carts/:id/line-items/:line_id — 更新数量", async () => {
    const created = await storePost("/store/carts", { currency_code: "USD" })
    const cartId = (await created.json()).cart.id
    const add = await storePost(`/store/carts/${cartId}/line-items`, {
      variant_id: variantId,
      quantity: 1,
    })
    const addBody = await add.json()
    const lineId = addBody.item?.id ?? addBody.items?.[0]?.id
    if (!lineId) return

    const res = await storePost(`/store/carts/${cartId}/line-items/${lineId}`, { quantity: 3 })
    expect(res.status).toBe(200)
  })

  it("POST /store/carts/:id/complete — 完成结账", async () => {
    const created = await storePost("/store/carts", { currency_code: "USD", email: "checkout@test.com" })
    const cartId = (await created.json()).cart.id
    await storePost(`/store/carts/${cartId}/line-items`, {
      variant_id: variantId,
      quantity: 1,
    })
    const res = await storePost(`/store/carts/${cartId}/complete`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.order?.id ?? body.type).toBeTruthy()
  })

  it("GET /store/carts/:id — 不存在的购物车返回 404", async () => {
    const res = await storeGet("/store/carts/cart_nonexistent")
    expect(res.status).toBe(404)
  })

  // ── Promo code ─────────────────────────────────

  it("POST /store/carts/:id/promotions — 应用优惠码", async () => {
    // Create cart with item so discount is calculable
    const created = await storePost("/store/carts", { currency_code: "USD" })
    const cartId = (await created.json()).cart.id
    await storePost(`/store/carts/${cartId}/line-items`, {
      variant_id: variantId,
      quantity: 2,
    })

    const res = await storePost(`/store/carts/${cartId}/promotions`, { code: promoCode })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.promotion?.code).toBe(promoCode)
    expect(typeof body.discount_total).toBe("number")

    // Cart should now include adjustments
    const cartRes = await storeGet(`/store/carts/${cartId}`)
    const cartBody = await cartRes.json()
    expect(cartBody.adjustments).toBeInstanceOf(Array)
  })

  it("POST /store/carts/:id/promotions — 优惠码不存在返回 404", async () => {
    const created = await storePost("/store/carts", { currency_code: "USD" })
    const cartId = (await created.json()).cart.id

    const res = await storePost(`/store/carts/${cartId}/promotions`, { code: "NO_SUCH_CODE_999" })
    expect(res.status).toBe(404)
  })

  it("POST /store/carts/:id/promotions — 空优惠码返回 400", async () => {
    const created = await storePost("/store/carts", { currency_code: "USD" })
    const cartId = (await created.json()).cart.id

    const res = await storePost(`/store/carts/${cartId}/promotions`, { code: "" })
    expect(res.status).toBe(400)
  })

  it("POST /store/carts/:id/promotions — 重复应用同一优惠码返回 400", async () => {
    const created = await storePost("/store/carts", { currency_code: "USD" })
    const cartId = (await created.json()).cart.id
    await storePost(`/store/carts/${cartId}/line-items`, {
      variant_id: variantId,
      quantity: 1,
    })

    await storePost(`/store/carts/${cartId}/promotions`, { code: promoCode })
    const res = await storePost(`/store/carts/${cartId}/promotions`, { code: promoCode })
    expect(res.status).toBe(400)
  })

  it("DELETE /store/carts/:id/promotions/:code — 移除优惠码", async () => {
    const created = await storePost("/store/carts", { currency_code: "USD" })
    const cartId = (await created.json()).cart.id
    await storePost(`/store/carts/${cartId}/line-items`, {
      variant_id: variantId,
      quantity: 1,
    })
    await storePost(`/store/carts/${cartId}/promotions`, { code: promoCode })

    // Send DELETE through app.fetch (same pattern as storePost/storeGet)
    const req = new Request(
      `http://localhost/api/store/carts/${cartId}/promotions/${encodeURIComponent(promoCode)}`,
      { method: "DELETE", headers: { "Content-Type": "application/json" } }
    )
    const delRes = await app.fetch(req)
    expect(delRes.status).toBe(200)
    const body = await delRes.json()
    expect(body.success).toBe(true)

    // Re-applying should succeed
    const reapply = await storePost(`/store/carts/${cartId}/promotions`, { code: promoCode })
    expect(reapply.status).toBe(200)
  })
})
