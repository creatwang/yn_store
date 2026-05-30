/**
 * Auth 扩展 API 测试
 */
import { describe, it, expect } from "vitest"
import { app } from "../../src/app"
import { getToken } from "../setup"

describe("Auth API 扩展", () => {
  it("DELETE /api/auth/session — 登出", async () => {
    const token = await getToken()
    const req = new Request("http://localhost/api/auth/session", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    const res = await app.fetch(req)
    expect(res.status).toBe(200)
  })

  it("POST /api/auth/password/confirmReset — 确认重置", async () => {
    const req = new Request("http://localhost/api/auth/password/confirmReset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "test", password: "newpass123" }),
    })
    const res = await app.fetch(req)
    expect([200, 400, 404]).toContain(res.status)
  })
})
