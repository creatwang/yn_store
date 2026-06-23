/**
 * 批量 API / 导入导出 冒烟测试
 */
import { describe, it, expect, beforeAll } from "vitest"
import { apiGet, apiPost, apiPostRetry } from "../setup"

describe("Admin 批量与扩展 API", () => {
  let productId: string
  let priceListId: string

  beforeAll(async () => {
    const pr = await apiPostRetry("/admin/products", { title: `Batch_${Date.now()}` })
    productId = (await pr.json()).product.id

    const plr = await apiPost("/admin/price-lists", {
      title: `PL_${Date.now()}`,
      description: "test",
      type: "sale",
      status: "draft",
    })
    if (plr.ok) {
      priceListId = (await plr.json()).price_list?.id
    }
  })

  describe("产品 import/export", () => {
    it("POST /admin/products/export — 返回 transaction_id", async () => {
      const res = await apiPost("/admin/products/export", { product_ids: [productId] })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.transaction_id).toBeDefined()
    })

    it("POST /admin/products/import — 返回 transaction_id", async () => {
      const { toCsv } = await import("../../src/lib/csv/csv")
      const csv = toCsv(
        ["Product Handle", "Product Title", "Variant Title", "Variant SKU"],
        [[`imp_${Date.now()}`, "Test", "Default", `SKU_${Date.now()}`]],
      )
      const res = await apiPost("/admin/products/import", { csv })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.transaction_id).toBeDefined()
    })
  })

  describe("价格列表 batch", () => {
    it("POST /admin/price-lists/:id/products — linkProducts", async () => {
      if (!priceListId) return
      const res = await apiPost(`/admin/price-lists/${priceListId}/products`, {
        product_ids: [productId],
      })
      expect(res.status).toBe(200)
    })

    it("POST /admin/price-lists/:id/prices/batch — batchPrices", async () => {
      if (!priceListId) return
      const res = await apiPost(`/admin/price-lists/${priceListId}/prices/batch`, {
        create: [],
        update: [],
        delete: [],
      })
      expect(res.status).toBe(200)
    })
  })

  describe("库存 batch", () => {
    it("POST /admin/inventory-items/location-levels/batch — 空 batch 不报错", async () => {
      const res = await apiPost("/admin/inventory-items/location-levels/batch", {
        create: [],
        update: [],
        delete: [],
      })
      expect(res.status).toBe(200)
    })
  })

  describe("合集关联产品", () => {
    it("POST /admin/collections/:id/products — link products", async () => {
      const cr = await apiPost("/admin/collections", { title: `Col_${Date.now()}` })
      if (!cr.ok) return
      const collectionId = (await cr.json()).collection?.id
      const res = await apiPost(`/admin/collections/${collectionId}/products`, {
        product_ids: [productId],
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
    })
  })

  describe("分类关联产品", () => {
    it("POST /admin/categories/:id/products — link products", async () => {
      const cr = await apiPost("/admin/categories", { name: `Cat_${Date.now()}`, is_active: true })
      if (!cr.ok) return
      const categoryId = (await cr.json()).product_category?.id
      const res = await apiPost(`/admin/categories/${categoryId}/products`, {
        product_ids: [productId],
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
    })
  })

  describe("销售渠道关联产品", () => {
    it("POST /admin/sales-channels/:id/products — link products", async () => {
      const list = await apiGet("/admin/sales-channels", { limit: "1" })
      const channels = (await list.json()).sales_channels ?? []
      if (!channels.length) return
      const channelId = channels[0].id
      const res = await apiPost(`/admin/sales-channels/${channelId}/products`, {
        product_ids: [productId],
      })
      expect(res.status).toBe(200)
    })
  })

  describe("履约 provider", () => {
    it("GET /admin/fulfillment-providers — 列表", async () => {
      const res = await apiGet("/admin/fulfillment-providers")
      expect(res.status).toBe(200)
    })

    it("GET /admin/fulfillment-providers/:id/options — 选项", async () => {
      const list = await apiGet("/admin/fulfillment-providers")
      const providers = (await list.json()).fulfillment_providers ?? []
      if (!providers.length) return
      const res = await apiGet(`/admin/fulfillment-providers/${providers[0].id}/options`)
      expect(res.status).toBe(200)
    })
  })
})
