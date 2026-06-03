/**
 * 复现 Admin 首页/搜索栏发起的请求，打印 500 原因。
 */
import { describe, it, expect } from "vitest"
import { apiGet } from "../setup"

const PROBES: { name: string; path: string; query?: Record<string, string> }[] =
  [
    { name: "users/me", path: "/admin/users/me" },
    {
      name: "orders",
      path: "/admin/orders",
      query: {
        q: "",
        limit: "3",
        fields: "id,display_id,status,email,total,currency_code,created_at",
      },
    },
    {
      name: "products",
      path: "/admin/products",
      query: { q: "", limit: "3", fields: "id,title,thumbnail" },
    },
    {
      name: "product-variants",
      path: "/admin/product-variants",
      query: { limit: "3", fields: "id,title,sku" },
    },
    {
      name: "inventory-items",
      path: "/admin/inventory-items",
      query: { limit: "3", fields: "id,sku,title" },
    },
    {
      name: "regions",
      path: "/admin/regions",
      query: { limit: "3", fields: "id,name" },
    },
    {
      name: "tax-regions",
      path: "/admin/tax-regions",
      query: { limit: "3", fields: "id,country_code" },
    },
    {
      name: "sales-channels",
      path: "/admin/sales-channels",
      query: { limit: "3", fields: "id,name" },
    },
    {
      name: "stock-locations",
      path: "/admin/stock-locations",
      query: { limit: "3", fields: "id,name" },
    },
  ]

describe("Dashboard probe (match Network tab)", () => {
  for (const probe of PROBES) {
    it(`GET ${probe.name} — not 500`, async () => {
      const res = await apiGet(probe.path, probe.query)
      const body = await res.json().catch(() => ({}))
      if (res.status >= 500) {
        console.error(`[${probe.name}] ${res.status}`, body)
      }
      expect(res.status, JSON.stringify(body)).toBeLessThan(500)
    })
  }
})
