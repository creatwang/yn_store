import { describe, it, expect } from "vitest"
import { app } from "../../src/app"

describe("seed admin login", () => {
  it("admin@yanan.com / 123456", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/auth/user/emailpass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@yanan.com",
          password: "123456",
        }),
      }),
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.token).toBeTruthy()
  })
})
