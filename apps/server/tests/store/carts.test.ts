/**
 * Store 购物车 API 测试
 */
import { describe, it, expect, beforeAll } from "vitest"
import { storePost, storeGet, apiPost, apiPostRetry } from "../setup"

describe("Store 购物车 API", () => {
  let variantId: string
  let productId: string

  beforeAll(async () => {
    const r = await apiPostRetry("/admin/products", { title: `CartTest_${Date.now()}` })
    productId = (await r.json()).product.id
    const vr = await apiPost(`/admin/products/${productId}/variants`, {
      title: "Default",
      sku: `CART_${Date.now()}`,
    })
    variantId = (await vr.json()).variant.id
  })

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
})
