import { hc } from "hono/client"
import type { AppType } from "@my-store/server/app"
import { authStorage } from "./auth-storage"

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

export const api = hc<AppType>(baseUrl, {
  fetch: createFetchWithAuth(),
})
