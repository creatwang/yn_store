/**
 * Upload API 冒烟测试
 */
import { describe, it, expect } from "vitest"
import { apiGet, apiDelete } from "../setup"

describe("Admin Upload API", () => {
  it("GET /admin/uploads/:id — 可访问", async () => {
    const res = await apiGet("/admin/uploads/file_nonexistent")
    expect(res.status).toBe(404)
  })

  it("DELETE /admin/uploads/:id — 可访问", async () => {
    const res = await apiDelete("/admin/uploads/file_nonexistent")
    expect(res.status).toBe(404)
  })
})
