/**
 * 履约 API 冒烟测试
 */
import { describe, it, expect } from "vitest"
import { apiGet } from "../setup"

describe("Admin 履约 API", () => {
  it("GET /admin/fulfillments — 列表", async () => {
    const res = await apiGet("/admin/fulfillments", { limit: "5" })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.fulfillments ?? body).toBeTruthy()
  })

  it("GET /admin/fulfillments/:id — 不存在返回 404", async () => {
    const res = await apiGet("/admin/fulfillments/ful_nonexistent")
    expect(res.status).toBe(404)
  })
})
