/**
 * 产品 CSV 导入导出测试
 */
import { describe, it, expect, beforeAll } from "vitest"
import { apiGet, apiPost, apiPostRetry } from "../setup"
import { toCsv } from "../../src/lib/csv/csv"

const CSV_HEADERS = [
  "Product Id",
  "Product Handle",
  "Product Title",
  "Product Subtitle",
  "Product Description",
  "Product Status",
  "Product Thumbnail",
  "Variant Id",
  "Variant Title",
  "Variant SKU",
  "Variant Allow Backorder",
  "Variant Manage Inventory",
  "Variant Price USD",
]

describe("产品 CSV 导入导出", () => {
  let transactionId: string

  it("POST /admin/products/import — CSV 解析返回 summary", async () => {
    const handle = `import_test_${Date.now()}`
    const csv = toCsv(CSV_HEADERS, [
      [
        "",
        handle,
        "导入测试产品",
        "",
        "描述",
        "draft",
        "",
        "",
        "默认",
        `SKU_${Date.now()}`,
        "FALSE",
        "TRUE",
        "19.99",
      ],
    ])

    const req = new Request("http://localhost/api/admin/products/import", {
      method: "POST",
      headers: {
        ...(await import("../setup").then((m) => m.authHeaders())),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ csv }),
    })
    const { app } = await import("../../src/app")
    const res = await app.fetch(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.transaction_id).toBeDefined()
    expect(body.summary.toCreate).toBeGreaterThanOrEqual(1)
    transactionId = body.transaction_id
  })

  it("POST /admin/products/import/:id/confirm — 确认导入", async () => {
    if (!transactionId) return
    const res = await apiPost(`/admin/products/import/${transactionId}/confirm`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.created_count + body.updated_count).toBeGreaterThanOrEqual(1)
  })

  it("POST /admin/products/export — 生成 CSV 文件", async () => {
    const res = await apiPost("/admin/products/export", {})
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.transaction_id).toBeDefined()
    expect(body.url).toMatch(/^\/api\/admin\/products\/export\//)

    const dl = await apiGet(`/admin/products/export/${body.transaction_id}`)
    expect(dl.status).toBe(200)
    const text = await dl.text()
    expect(text).toContain("Product Handle")
  })
})

describe("Store 结账扩展 API", () => {
  let cartId: string
  let variantId: string

  beforeAll(async () => {
    const pr = await apiPostRetry("/admin/products", { title: `Checkout_${Date.now()}` })
    const productId = (await pr.json()).product.id
    const vr = await apiPost(`/admin/products/${productId}/variants`, {
      title: "Default",
      sku: `CHK_${Date.now()}`,
    })
    variantId = (await vr.json()).variant.id
  })

  it("GET /store/shipping-options — 列表", async () => {
    const { storeGet } = await import("../setup")
    const res = await storeGet("/store/shipping-options")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.shipping_options).toBeInstanceOf(Array)
  })

  it("GET /store/payment-providers — 列表", async () => {
    const { storeGet } = await import("../setup")
    const res = await storeGet("/store/payment-providers")
    expect(res.status).toBe(200)
  })

  it("POST /store/carts/:id/shipping-methods — 添加配送", async () => {
    const { storePost, storeGet } = await import("../setup")
    const created = await storePost("/store/carts", { currency_code: "USD", email: "ship@test.com" })
    cartId = (await created.json()).cart.id
    await storePost(`/store/carts/${cartId}/line-items`, { variant_id: variantId, quantity: 1 })

    const opts = await storeGet("/store/shipping-options")
    const options = (await opts.json()).shipping_options ?? []
    if (!options.length) return

    const res = await storePost(`/store/carts/${cartId}/shipping-methods`, {
      option_id: options[0].id,
    })
    expect(res.status).toBe(201)
  })
})
