/**
 * 订单模块回归测试
 *
 * 覆盖: ORD-01~07
 * - Admin: 列表 / 详情 / 创建 / 更新 / 取消 / 归档 / 完成
 * - Store: 列表 / 详情
 * - 边界: 401 / 404 / 校验
 *
 * 每次订单模块改动后运行：
 *   pnpm --filter=@my-store/server test
 */
import { describe, it, expect, afterAll, beforeAll } from "vitest"
import { apiGet, apiPost, apiPostRetry, storeGet, unauthGet } from "../setup"

// 测试期间创建的订单，最后统一清理
const createdIds: string[] = []

afterAll(async () => {
  // 软删创建的订单（改为 canceled 状态 + deleted_at）
  for (const id of createdIds) {
    await apiPost(`/admin/orders/${id}/cancel`)
  }
})

// ---------------------------------------------------------------------------
describe("Admin 订单 API — CRUD", () => {
  describe("POST /api/admin/orders — 创建订单", () => {
    it("应返回 201 并包含订单对象", async () => {
      const uniqueEmail = `test_${Date.now()}@example.com`
      const res = await apiPostRetry("/admin/orders", {
        email: uniqueEmail,
        currency_code: "USD",
      })
      expect(res.status).toBe(201)

      const body = await res.json()
      expect(body.order).toBeDefined()
      expect(body.order.id).toMatch(/^order_/)
      expect(body.order.email).toBe(uniqueEmail)
      expect(body.order.currency_code).toBe("USD")
      expect(body.order.status).toBe("pending")
      createdIds.push(body.order.id)
    })

    it("不传 token 应返回 401", async () => {
      const res = await unauthGet("/admin/orders")
      expect(res.status).toBe(401)
    })
  })

  // -----------------------------------------------------------------------
  describe("GET /api/admin/orders — 订单列表", () => {
    let orderId: string

    beforeAll(async () => {
      const r = await apiPost("/admin/orders", {
        email: `list_test_${Date.now()}@example.com`,
        currency_code: "USD",
      })
      orderId = (await r.json()).order.id
      createdIds.push(orderId)
    })

    it("应返回 orders 数组和分页信息", async () => {
      const res = await apiGet("/admin/orders", { limit: "10", offset: "0" })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.orders).toBeInstanceOf(Array)
      expect(body.count).toBeGreaterThanOrEqual(0)
      expect(body.limit).toBe(10)
      expect(body.offset).toBe(0)

      if (body.orders.length > 0) {
        const first = body.orders[0]
        expect(typeof first.payment_status).toBe("string")
        expect(typeof first.fulfillment_status).toBe("string")
      }
    })

    it("fields 未请求 fulfillments 时不应返回 fulfillments 关联", async () => {
      const fields =
        "id,payment_status,fulfillment_status,total,*payment_collections"
      const res = await apiGet("/admin/orders", { limit: "5", offset: "0", fields })
      expect(res.status).toBe(200)

      const body = await res.json()
      for (const row of body.orders) {
        expect(row.fulfillments).toBeUndefined()
        expect(typeof row.payment_status).toBe("string")
      }
    })

    it("q 参数应支持模糊搜索 email", async () => {
      const uniqueEmail = `search_${Date.now()}@example.com`
      const r = await apiPost("/admin/orders", {
        email: uniqueEmail,
        currency_code: "USD",
      })
      const newId = (await r.json()).order.id
      createdIds.push(newId)

      const res = await apiGet("/admin/orders", { q: uniqueEmail })
      const body = await res.json()
      expect(body.orders.length).toBeGreaterThanOrEqual(1)
      expect(body.orders.some((o: any) => o.email === uniqueEmail)).toBe(true)
    })

    it("status 参数应能筛选订单状态", async () => {
      const res = await apiGet("/admin/orders", { status: "pending" })
      const body = await res.json()
      for (const o of body.orders) {
        expect(o.status).toBe("pending")
      }
    })
  })

  // -----------------------------------------------------------------------
  describe("GET /api/admin/orders/:id — 订单详情", () => {
    let orderId: string

    beforeAll(async () => {
      const r = await apiPost("/admin/orders", {
        email: `detail_test_${Date.now()}@example.com`,
        currency_code: "USD",
      })
      orderId = (await r.json()).order.id
      createdIds.push(orderId)
    })

    it("应返回订单对象", async () => {
      const res = await apiGet(`/admin/orders/${orderId}`)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.order.id).toBe(orderId)
      expect(body.order.email).toMatch(/^detail_test_/)
      expect(body.order.summary).toBeDefined()
      expect(typeof body.order.summary.pending_difference).toBe("number")
      expect(typeof body.order.item_subtotal).toBe("number")
      expect(Array.isArray(body.order.items)).toBe(true)
      if (body.order.items.length > 0) {
        expect(body.order.items[0].detail).toBeDefined()
        // 如关联了 variant，应含 product 嵌套
        if (body.order.items[0].variant) {
          expect(body.order.items[0].variant.product).toBeDefined()
          expect(body.order.items[0].variant.product.title).toBeDefined()
        }
      }
    })

    it("不存在的订单返回 404", async () => {
      const res = await apiGet("/admin/orders/nonexistent_id")
      expect(res.status).toBe(404)
    })
  })

  // -----------------------------------------------------------------------
  describe("POST /api/admin/orders/:id — 更新订单", () => {
    let orderId: string

    beforeAll(async () => {
      const r = await apiPost("/admin/orders", {
        email: `update_before_${Date.now()}@example.com`,
        currency_code: "USD",
      })
      orderId = (await r.json()).order.id
      createdIds.push(orderId)
    })

    it("应更新 email", async () => {
      const newEmail = `updated_${Date.now()}@example.com`
      const res = await apiPost(`/admin/orders/${orderId}`, {
        email: newEmail,
      })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.order.email).toBe(newEmail)
    })

    it("应该能更新 currency_code", async () => {
      const res = await apiPost(`/admin/orders/${orderId}`, {
        currency_code: "EUR",
      })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.order.currency_code).toBe("EUR")
    })
  })
})

// ---------------------------------------------------------------------------
describe("Admin 订单 API — 状态变更", () => {
  describe("POST /api/admin/orders/:id/cancel — 取消订单", () => {
    it("应取消订单并设置 canceled_at", async () => {
      const r = await apiPost("/admin/orders", {
        email: `cancel_test_${Date.now()}@example.com`,
        currency_code: "USD",
      })
      const orderId = (await r.json()).order.id
      createdIds.push(orderId)

      const res = await apiPost(`/admin/orders/${orderId}/cancel`)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.order.status).toBe("canceled")
      expect(body.order.canceled_at).toBeTruthy()
    })

    it("不存在的订单取消应返回 404", async () => {
      const res = await apiPost("/admin/orders/nonexistent_id/cancel")
      expect(res.status).toBe(404)
    })
  })

  describe("POST /api/admin/orders/:id/archive — 归档订单", () => {
    it("应归档订单", async () => {
      const r = await apiPost("/admin/orders", {
        email: `archive_test_${Date.now()}@example.com`,
        currency_code: "USD",
      })
      const orderId = (await r.json()).order.id
      createdIds.push(orderId)

      const res = await apiPost(`/admin/orders/${orderId}/archive`)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.order.status).toBe("archived")
    })

    it("不存在的订单归档应返回 404", async () => {
      const res = await apiPost("/admin/orders/nonexistent_id/archive")
      expect(res.status).toBe(404)
    })
  })

  describe("POST /api/admin/orders/:id/complete — 完成订单", () => {
    it("应完成订单", async () => {
      const r = await apiPost("/admin/orders", {
        email: `complete_test_${Date.now()}@example.com`,
        currency_code: "USD",
      })
      const orderId = (await r.json()).order.id
      createdIds.push(orderId)

      const res = await apiPost(`/admin/orders/${orderId}/complete`)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.order.status).toBe("completed")
    })

    it("不存在的订单完成应返回 404", async () => {
      const res = await apiPost("/admin/orders/nonexistent_id/complete")
      expect(res.status).toBe(404)
    })
  })
})

// ---------------------------------------------------------------------------
describe("Store 订单 API", () => {
  describe("GET /api/store/orders — 订单列表", () => {
    it("应返回 orders 数组（用 customer JWT）", async () => {
      const res = await storeGet("/store/orders", { limit: "10", offset: "0" })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.orders).toBeInstanceOf(Array)
      expect(body.count).toBeGreaterThanOrEqual(0)
    })

    it("不用 customer JWT 应返回 401", async () => {
      const res = await unauthGet("/store/orders")
      expect(res.status).toBe(401)
    })

    it("用 admin JWT 应返回 401（actor_type 不匹配）", async () => {
      const res = await apiGet("/store/orders")
      expect(res.status).toBe(401)
    })
  })

  describe("GET /api/store/orders/:id — 订单详情", () => {
    it("不存在的订单返回 404", async () => {
      const res = await storeGet("/store/orders/nonexistent_id")
      expect(res.status).toBe(404)
    })
  })
})
