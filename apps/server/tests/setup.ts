/**
 * 测试全局 Setup — DB 连接、JWT token 生成、seed/clean 工具
 */
import { beforeAll, afterAll } from "vitest"
import { config } from "dotenv"
import { resolve } from "path"
import { setDb, createDb, resetDb } from "@my-store/db"
import { signToken } from "../src/lib/jwt"
import { app } from "../src/app"

// 加载 .env
config({ path: resolve(__dirname, "..", ".env") })

// 初始化 DB 连接
const dbUrl = process.env.DATABASE_URL!
beforeAll(() => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL 未设置，请确保 apps/server/.env 存在")
  }
  setDb(createDb(dbUrl))
})

afterAll(() => {
  resetDb()
})

// ---------------------------------------------------------------------------
// 认证工具
// ---------------------------------------------------------------------------
let _token: string | null = null

/** 获取 admin JWT token（全局复用） */
export async function getToken(): Promise<string> {
  if (_token) return _token
  _token = await signToken({
    sub: "test-user",
    actor_id: "test-user-001",
    actor_type: "user",
    email: "test@test.com",
  })
  return _token
}

/** 生成带 auth header 的 RequestInit */
export async function authHeaders(): Promise<Record<string, string>> {
  return { Authorization: `Bearer ${await getToken()}` }
}

// ---------------------------------------------------------------------------
// HTTP 请求工具（通过 app.fetch 直接测试 Hono handler，不发真实网络）
// ---------------------------------------------------------------------------

/** GET 请求 */
export async function apiGet(path: string, query?: Record<string, string>) {
  const qs = query ? "?" + new URLSearchParams(query).toString() : ""
  const req = new Request(`http://localhost/api${path}${qs}`, {
    headers: await authHeaders(),
  })
  return app.fetch(req)
}

/** POST 请求 */
export async function apiPost(path: string, body?: any) {
  const req = new Request(`http://localhost/api${path}`, {
    method: "POST",
    headers: {
      ...(await authHeaders()),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return app.fetch(req)
}

/** POST 请求（带重试，应对 Supabase 冷启动） */
export async function apiPostRetry(path: string, body?: any, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    const res = await apiPost(path, body)
    if (res.status !== 500 || i === retries) return res
    await sleep(500 * (i + 1))
  }
  return apiPost(path, body)
}

/** DELETE 请求 */
export async function apiDelete(path: string) {
  const req = new Request(`http://localhost/api${path}`, {
    method: "DELETE",
    headers: await authHeaders(),
  })
  return app.fetch(req)
}

/** 不带 token 的 GET（测试 401） */
export async function unauthGet(path: string) {
  const req = new Request(`http://localhost/api${path}`)
  return app.fetch(req)
}

// ---------------------------------------------------------------------------
// 等待一小段（避免 Supabase 冷启动延迟）
// ---------------------------------------------------------------------------
export function sleep(ms = 200) {
  return new Promise((r) => setTimeout(r, ms))
}
