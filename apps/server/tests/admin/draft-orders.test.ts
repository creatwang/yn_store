/**
 * 草稿订单 API 回归测试
 */
import { describe, it, expect, afterAll } from "vitest"
import { apiGet, apiPost, unauthGet } from "../setup"

const createdIds: string[] = []

afterAll(async () => {
  for (const id of createdIds) {
    await apiPost(`/admin/draft-orders/${id}`, { metadata: { test_cleanup: true } })
  }
})

describe("Admin 草稿订单 API", () => {
  describe("POST /api/admin/draft-orders — 创建", () => {
    it("应返回 201 且 is_draft_order 为 true", async () => {
      const email = `draft_${Date.now()}@example.com`
      const res = await apiPost("/admin/draft-orders", {
        email,
        currency_code: "USD",
      })
      expect(res.status).toBe(201)

      const body = await res.json()
      expect(body.draft_order).toBeDefined()
      expect(body.draft_order.id).toMatch(/^order_/)
      expect(body.draft_order.email).toBe(email)
      expect(body.draft_order.status).toBe("draft")
      expect(body.draft_order.is_draft_order).toBe(true)
      createdIds.push(body.draft_order.id)
    })
  })

  describe("GET /api/admin/draft-orders — 列表", () => {
    it("应返回 draft_orders 与 count", async () => {
      const res = await apiGet("/admin/draft-orders", { limit: "10", offset: "0" })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.draft_orders).toBeInstanceOf(Array)
      expect(typeof body.count).toBe("number")
    })

    it("不传 token 应返回 401", async () => {
      const res = await unauthGet("/admin/draft-orders")
      expect(res.status).toBe(401)
    })
  })

  describe("草稿 → 正式订单", () => {
    it("convert-to-order 后 is_draft_order 为 false", async () => {
      const email = `convert_${Date.now()}@example.com`
      const createRes = await apiPost("/admin/draft-orders", {
        email,
        currency_code: "USD",
      })
      const draftId = (await createRes.json()).draft_order.id
      createdIds.push(draftId)

      const convertRes = await apiPost(
        `/admin/draft-orders/${draftId}/convert-to-order`
      )
      expect(convertRes.status).toBe(200)

      const { order } = await convertRes.json()
      expect(order.id).toBe(draftId)
      expect(order.is_draft_order).toBe(false)
      expect(order.status).toBe("pending")
      expect(order.email).toBe(email)

      const draftRes = await apiGet(`/admin/draft-orders/${draftId}`)
      expect(draftRes.status).toBe(404)
    })
  })
})
