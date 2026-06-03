import { hc } from "hono/client"
import { stringify } from "qs"
import type { AppType } from "@my-store/server/app"
import { authStorage } from "./auth-storage"

/**
 * 留空 = 与页面同源（Hono 挂 /app 静态时请求 /api）。
 * 独立 Vite :5173 时可设 VITE_API_URL=http://localhost:7000，或依赖 vite proxy /api
 */
const baseUrl = import.meta.env.VITE_API_URL || ""

export function getAuthHeaders(): Record<string, string> {
  const token = authStorage.getToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

function createFetchWithAuth(baseFetch: typeof fetch = fetch) {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers)
    const authHeaders = getAuthHeaders()
    Object.entries(authHeaders).forEach(([key, value]) => {
      headers.set(key, value)
    })
    return baseFetch(input, { ...init, headers })
  }
}

const client = hc<AppType>(baseUrl, {
  fetch: createFetchWithAuth(),
})

/** 挂载在 /api 下的 RPC 客户端（对应 server app.route('/api', apiRoutes)） */
export const api = client.api

type ApiErrorBody = {
  message?: string
  type?: string
}

/**
 * Hono RPC query：用 qs 展开 operator map / 数组（非 JSON 字符串）。
 * 需 Record<string, string | string[]>，故从 qs 串还原 bracket 键名。
 */
export function toRpcQuery<T extends Record<string, unknown>>(
  params: T,
): Record<string, string | string[]> {
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    cleaned[key] = value
  }

  const serialized = stringify(cleaned, { skipNulls: true })
  if (!serialized) return {}

  const out: Record<string, string | string[]> = {}
  const usp = new URLSearchParams(serialized)
  for (const key of new Set(usp.keys())) {
    const all = usp.getAll(key)
    out[key] = all.length === 1 ? all[0]! : all
  }
  return out
}

/** 校验 HTTP 状态并解析 JSON；对 404 不抛异常，返回空对象 */
export async function parseJsonResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    authStorage.clear()
    // 硬跳转到登录页，让 ProtectedRoute 接管后续流程
    // 排除 /auth/ 路径的请求（登录、注册、重置密码等），避免死循环
    if (!res.url?.includes("/auth/")) {
      window.location.href = "/app/login"
    }
    throw new Error("Unauthorized")
  }

  if (res.ok) {
    return res.json() as Promise<T>
  }

  let message = `请求失败 (${res.status})`
  try {
    const body = (await res.json()) as ApiErrorBody
    if (body.message) {
      message = body.message
    }
  } catch {
    // 非 JSON 响应
  }
  throw new Error(message)
}
