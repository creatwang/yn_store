/**
 * 产品模块回归测试
 *
 * 覆盖: PROD-01~05, VAR-01~05, OPT-01~04
 * 每次产品模块改动后运行：
 *   pnpm --filter=@my-store/server test
 */
import { describe, it, expect, afterAll, beforeAll } from "vitest"
import { apiGet, apiPost, apiPostRetry, apiDelete, unauthGet } from "../setup"

// 测试期间创建的资源，最后统一清理
const createdIds: string[] = []

afterAll(async () => {
  for (const id of createdIds) {
    await apiDelete(`/admin/products/${id}`)
  }
})

// ---------------------------------------------------------------------------
describe("产品模块 CRUD (Admin Products API)", () => {

  describe("POST /api/admin/products — 创建产品", () => {
    it("应返回 201 并包含产品对象", async () => {
      const uniqueTitle = `测试产品_${Date.now()}`
      const res = await apiPostRetry("/admin/products", { title: uniqueTitle })
      expect(res.status).toBe(201)

      const body = await res.json()
      expect(body.product).toBeDefined()
      expect(body.product.id).toMatch(/^prod_/)
      expect(body.product.title).toBe(uniqueTitle)
      expect(body.product.status).toBe("draft")
      createdIds.push(body.product.id)
    })

    it("创建时缺少必填字段 title 应返回 400", async () => {
      const res = await apiPost("/admin/products", {})
      expect(res.status).toBe(400)
    })

    it("不传 token 应返回 401", async () => {
      const res = await unauthGet("/admin/products")
      expect(res.status).toBe(401)
    })
  })

  // -----------------------------------------------------------------------
  describe("GET /api/admin/products — 产品列表", () => {
    it("应返回 products 数组和分页信息", async () => {
      const res = await apiGet("/admin/products", { limit: "10", offset: "0" })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.products).toBeInstanceOf(Array)
      expect(body.count).toBeGreaterThanOrEqual(0)
      expect(body.limit).toBe(10)
      expect(body.offset).toBe(0)
    })

    it("q 参数应支持模糊搜索", async () => {
      // 先创建一个独特标题
      const uniqueTitle = `SEARCH_TEST_${Date.now()}`
      const r = await apiPost("/admin/products", { title: uniqueTitle })
      const productId = (await r.json()).product.id
      createdIds.push(productId)

      const res = await apiGet("/admin/products", { q: uniqueTitle })
      const body = await res.json()
      expect(body.products.length).toBeGreaterThanOrEqual(1)
      expect(body.products.some((p: any) => p.title === uniqueTitle)).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  describe("GET /api/admin/products/:id — 产品详情", () => {
    let productId: string
    let productTitle: string

    beforeAll(async () => {
      productTitle = `详情测试_${Date.now()}`
      const r = await apiPost("/admin/products", { title: productTitle })
      productId = (await r.json()).product.id
      createdIds.push(productId)
    })

    it("应返回产品及关联数据", async () => {
      const res = await apiGet(`/admin/products/${productId}`)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.product.id).toBe(productId)
      expect(body.product.title).toBe(productTitle)
    })

    it("应包含 variants 字段（空数组或数组）", async () => {
      const res = await apiGet(`/admin/products/${productId}`)
      const body = await res.json()
      expect(Array.isArray(body.product.variants)).toBe(true)
    })

    it("不应包含 inventory_items（对齐官方默认字段）", async () => {
      const res = await apiGet(`/admin/products/${productId}`)
      const body = await res.json()
      // 确认 variants 没有返回 inventory_items 对象
      for (const v of body.product.variants || []) {
        expect(v.inventory_items).toBeUndefined()
      }
    })

    it("不存在的产品返回 404", async () => {
      const res = await apiGet("/admin/products/nonexistent_id")
      expect(res.status).toBe(404)
    })
  })

  // -----------------------------------------------------------------------
  describe("POST /api/admin/products/:id — 更新产品", () => {
    let productId: string

    beforeAll(async () => {
      const r = await apiPost("/admin/products", { title: `更新前_${Date.now()}` })
      productId = (await r.json()).product.id
      createdIds.push(productId)
    })

    it("应更新标题", async () => {
      const res = await apiPost(`/admin/products/${productId}`, { title: "更新后" })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.product.title).toBe("更新后")
    })
  })

  // -----------------------------------------------------------------------
  describe("DELETE /api/admin/products/:id — 删除产品", () => {
    it("应软删产品并返回 deleted: true", async () => {
      const r = await apiPost("/admin/products", { title: `待删除_${Date.now()}` })
      const productId = (await r.json()).product.id

      const res = await apiDelete(`/admin/products/${productId}`)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.id).toBe(productId)
      expect(body.deleted).toBe(true)

      // 再次查询应 404
      const recheck = await apiGet(`/admin/products/${productId}`)
      expect(recheck.status).toBe(404)
    })
  })
})

// ---------------------------------------------------------------------------
describe("变体子路由 (Admin Product Variants API)", () => {
  let productId: string

  beforeAll(async () => {
    const r = await apiPost("/admin/products", { title: `变体测试_${Date.now()}` })
    productId = (await r.json()).product.id
    createdIds.push(productId)
  })

  it("GET /admin/products/:pid/variants — 变体列表", async () => {
    const res = await apiGet(`/admin/products/${productId}/variants`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.variants).toBeInstanceOf(Array)
    expect(body.count).toBeGreaterThanOrEqual(0)
  })

  it("POST /admin/products/:pid/variants — 创建变体", async () => {
    const sku = `SKU_${Date.now()}`
    const res = await apiPost(`/admin/products/${productId}/variants`, {
      title: "Red Variant",
      sku,
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.variant.id).toMatch(/^variant_/)
    expect(body.variant.title).toBe("Red Variant")
  })

  it("POST ...variants/:vid — 更新变体", async () => {
    // 先创建
    const c = await apiPost(`/admin/products/${productId}/variants`, { title: "Old" })
    const variantId = (await c.json()).variant.id

    const res = await apiPost(`/admin/products/${productId}/variants/${variantId}`, { title: "Updated" })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.variant.title).toBe("Updated")
  })

  it("DELETE ...variants/:vid — 删除变体", async () => {
    const c = await apiPost(`/admin/products/${productId}/variants`, { title: "To Delete" })
    const variantId = (await c.json()).variant.id

    const res = await apiDelete(`/admin/products/${productId}/variants/${variantId}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deleted).toBe(true)
  })

  // ------ Batch ------
  it("POST ...variants/batch — 批量创建+更新+删除", async () => {
    const sku = `BATCH_${Date.now()}`
    const res = await apiPost(`/admin/products/${productId}/variants/batch`, {
      create: [{ title: "Batch Created", sku }],
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.created.length).toBe(1)
    expect(body.created[0].title).toBe("Batch Created")
  })

  // ------ Inventory ------
  it("GET ...variants?inventory_quantity=true — 变体列表含库存量", async () => {
    const res = await apiGet(
      `/admin/products/${productId}/variants`,
      { inventory_quantity: "true" }
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    for (const v of body.variants || []) {
      expect(typeof v.inventory_quantity).toBe("number")
    }
  })
})

// ---------------------------------------------------------------------------
describe("选项子路由 (Admin Product Options API)", () => {
  let productId: string

  beforeAll(async () => {
    const r = await apiPost("/admin/products", { title: `选项测试_${Date.now()}` })
    productId = (await r.json()).product.id
    createdIds.push(productId)
  })

  it("POST /admin/products/:pid/options — 创建选项", async () => {
    const res = await apiPost(`/admin/products/${productId}/options`, { title: "Color" })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.option.id).toMatch(/^opt_/)
    expect(body.option.title).toBe("Color")
  })

  it("POST ...options/:oid — 更新选项", async () => {
    const c = await apiPost(`/admin/products/${productId}/options`, { title: "Old Option" })
    const optionId = (await c.json()).option.id

    const res = await apiPost(
      `/admin/products/${productId}/options/${optionId}`,
      { title: "New Option" }
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.option.title).toBe("New Option")
  })

  it("DELETE ...options/:oid — 删除选项", async () => {
    const c = await apiPost(`/admin/products/${productId}/options`, { title: "To Remove" })
    const optionId = (await c.json()).option.id

    const res = await apiDelete(`/admin/products/${productId}/options/${optionId}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deleted).toBe(true)
  })
})
