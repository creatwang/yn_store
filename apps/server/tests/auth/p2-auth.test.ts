/**
 * P2 — Auth 注册/重置/邀请 accept
 */
import { describe, it, expect } from "vitest"
import { app } from "../../src/app"
import { getToken } from "../setup"

describe("Auth P2 — register / reset / invite", () => {
  it("POST /auth/user/emailpass/register — 创建 admin 用户并返回 token", async () => {
    const email = `admin_reg_${Date.now()}@test.com`
    const res = await app.fetch(
      new Request("http://localhost/api/auth/user/emailpass/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "password123" }),
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token).toBeTruthy()
  })

  it("POST /auth/user/emailpass/reset-password + update — 重置密码", async () => {
    const email = `reset_${Date.now()}@test.com`
    const reg = await app.fetch(
      new Request("http://localhost/api/auth/user/emailpass/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "oldpass123" }),
      }),
    )
    expect(reg.status).toBe(200)

    const reqReset = await app.fetch(
      new Request("http://localhost/api/auth/user/emailpass/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email }),
      }),
    )
    expect(reqReset.status).toBe(200)
    const { reset_token } = await reqReset.json()
    expect(reset_token).toBeTruthy()

    const confirm = await app.fetch(
      new Request(`http://localhost/api/auth/user/emailpass/update?token=${encodeURIComponent(reset_token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "newpass123" }),
      }),
    )
    expect(confirm.status).toBe(200)

    const login = await app.fetch(
      new Request("http://localhost/api/auth/user/emailpass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "newpass123" }),
      }),
    )
    expect(login.status).toBe(200)
  })

  it("POST /admin/invites + accept — 邀请注册流程", async () => {
    const adminToken = await getToken()
    const email = `invite_${Date.now()}@test.com`

    const createRes = await app.fetch(
      new Request("http://localhost/api/admin/invites", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      }),
    )
    expect(createRes.status).toBe(201)
    const { invite, invite_url } = await createRes.json()
    expect(invite.token).toBeTruthy()
    expect(invite_url).toContain("/invite?token=")

    const registerRes = await app.fetch(
      new Request("http://localhost/api/auth/user/emailpass/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "invitepass123" }),
      }),
    )
    expect(registerRes.status).toBe(200)
    const { token: userToken } = await registerRes.json()

    const acceptRes = await app.fetch(
      new Request(`http://localhost/api/admin/invites/accept?token=${encodeURIComponent(invite.token)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          first_name: "Inv",
          last_name: "User",
        }),
      }),
    )
    expect(acceptRes.status).toBe(200)
  })
})

describe("Auth — C 端客户注册 + OAuth 回调", () => {
  it("POST /auth/customer/emailpass/register — 客户注册返回 token", async () => {
    const email = `cust_auth_${Date.now()}@test.com`
    const res = await app.fetch(
      new Request("http://localhost/api/auth/customer/emailpass/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "password123" }),
      }),
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.token).toBeTruthy()
    expect(body.customer).toBeTruthy()
    expect(body.customer.email).toBe(email)
  })

  it("POST /auth/customer/emailpass/register — 重复邮箱返回 409", async () => {
    const email = `dup_auth_${Date.now()}@test.com`
    const res1 = await app.fetch(
      new Request("http://localhost/api/auth/customer/emailpass/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "password123" }),
      }),
    )
    expect(res1.status).toBe(201)
    const res2 = await app.fetch(
      new Request("http://localhost/api/auth/customer/emailpass/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "password456" }),
      }),
    )
    expect(res2.status).toBe(409)
  })

  it("GET /auth/:actor/:provider/callback — 无效 actor_type 返回 400", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/auth/admin/google/callback", {
        method: "GET",
      }),
    )
    expect(res.status).toBe(400)
  })

  it("GET /auth/customer/github/callback — provider 未配置返回 501", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/auth/customer/github/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "test_code" }),
      }),
    )
    expect(res.status).toBe(501)
  })

  it("GET /auth/customer/google/callback — 无 credential 返回 400", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/auth/customer/google/callback", {
        method: "GET",
      }),
    )
    expect(res.status).toBe(400)
  })

  it("POST /auth/customer/google/callback — 无效 credential 返回 401", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/auth/customer/google/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: "invalid_token" }),
      }),
    )
    expect(res.status).toBe(401)
  })
})

describe("Store P2 — collections / promotions", () => {
  it("GET /store/collections — 列表", async () => {
    const res = await app.fetch(new Request("http://localhost/api/store/collections"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.collections).toBeInstanceOf(Array)
  })

  it("GET /store/promotions — 列表", async () => {
    const res = await app.fetch(new Request("http://localhost/api/store/promotions"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.promotions).toBeInstanceOf(Array)
  })
})
