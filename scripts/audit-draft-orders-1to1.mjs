/**
 * 对照 Medusa v2.15.3 draft-orders API 路径 — CI/本地自检，无需人工贴 Network。
 * 用法: node scripts/audit-draft-orders-1to1.mjs
 */
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const ROUTES_FILE = path.join(
  REPO,
  "apps/server/src/routes/admin/draft-orders.ts",
)

/** 官方 v2.15.3 必须存在的 HTTP 路由（method + path 模板） */
const OFFICIAL_ROUTES = [
  ["GET", "/"],
  ["POST", "/"],
  ["GET", "/:id"],
  ["POST", "/:id"],
  ["DELETE", "/:id"],
  ["POST", "/:id/convert-to-order"],
  ["POST", "/:id/edit"],
  ["DELETE", "/:id/edit"],
  ["POST", "/:id/edit/items"],
  ["POST", "/:id/edit/items/item/:itemId"],
  ["POST", "/:id/edit/items/:actionId"],
  ["DELETE", "/:id/edit/items/:actionId"],
  ["POST", "/:id/edit/promotions"],
  ["DELETE", "/:id/edit/promotions"],
  ["POST", "/:id/edit/shipping-methods"],
  ["POST", "/:id/edit/shipping-methods/method/:methodId"],
  ["DELETE", "/:id/edit/shipping-methods/method/:methodId"],
  ["POST", "/:id/edit/shipping-methods/:actionId"],
  ["DELETE", "/:id/edit/shipping-methods/:actionId"],
  ["POST", "/:id/edit/request"],
  ["POST", "/:id/edit/confirm"],
]

const FORBIDDEN = [
  "/:id/edit/promotions/:actionId",
  'promotionSchema = z.object({ code',
]

async function main() {
  const src = await fs.readFile(ROUTES_FILE, "utf8")
  const missing = []
  for (const [method, p] of OFFICIAL_ROUTES) {
    const m = method.toLowerCase()
    const ok =
      src.includes(`.${m}("${p}"`) ||
      src.includes(`.${m}(\n    "${p}"`) ||
      src.includes(`.${m}(\r\n    "${p}"`)
    if (!ok) missing.push(`${method} ${p}`)
  }
  const bad = FORBIDDEN.filter((s) => src.includes(s))

  if (missing.length || bad.length) {
    console.error("draft-orders 1:1 审计失败\n")
    if (missing.length) {
      console.error("缺少路由:")
      missing.forEach((r) => console.error(`  - ${r}`))
    }
    if (bad.length) {
      console.error("禁止残留旧实现:")
      bad.forEach((r) => console.error(`  - ${r}`))
    }
    process.exit(1)
  }
  console.log(`OK: ${OFFICIAL_ROUTES.length} 条官方路由均已注册`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
