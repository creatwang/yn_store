import { hc } from "hono/client"
import type { AppType } from "@my-store/server/app"

const baseUrl = import.meta.env.VITE_API_URL || ""

export const api = hc<AppType>(baseUrl)

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("admin_token")
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}
