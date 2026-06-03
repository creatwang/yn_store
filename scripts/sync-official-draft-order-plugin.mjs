/**
 * 从 Medusa v2.15.3 draft-order 插件拉取官方 Admin UI 到 demo 对照目录。
 * 用法: node scripts/sync-official-draft-order-plugin.mjs
 */
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const TAG = "v2.15.3"
const BASE = `https://raw.githubusercontent.com/medusajs/medusa/${TAG}/packages/plugins/draft-order/src/admin`

const ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "apps",
  "admin",
  "demo",
  "draft-order-plugin",
)

/** 相对 admin/ 的路径 */
const FILES = [
  "hooks/api/draft-orders.tsx",
  "routes/draft-orders/page.tsx",
  "routes/draft-orders/@create/page.tsx",
  "routes/draft-orders/[id]/page.tsx",
  "routes/draft-orders/[id]/@items/page.tsx",
  "routes/draft-orders/[id]/@custom-items/page.tsx",
  "routes/draft-orders/[id]/@promotions/page.tsx",
  "routes/draft-orders/[id]/@shipping/page.tsx",
  "routes/draft-orders/[id]/@shipping-address/page.tsx",
  "routes/draft-orders/[id]/@billing-address/page.tsx",
  "routes/draft-orders/[id]/@email/page.tsx",
  "routes/draft-orders/[id]/@sales-channel/page.tsx",
  "routes/draft-orders/[id]/@metadata/page.tsx",
  "routes/draft-orders/[id]/@transfer-ownership/page.tsx",
  "components/draft-orders/active-order-changes.tsx",
  "components/draft-orders/activity-section.tsx",
  "components/draft-orders/customer-section.tsx",
  "components/draft-orders/general-section.tsx",
  "components/draft-orders/json-view-section.tsx",
  "components/draft-orders/metadata-section.tsx",
  "components/draft-orders/shipping-section.tsx",
  "components/draft-orders/summary-section.tsx",
  "lib/utils/order-utils.ts",
  "lib/utils/string-utils.ts",
]

function toRawUrl(rel) {
  const encoded = rel.replace(/\[id\]/g, "%5Bid%5D").replace(/@/g, "%40")
  return `${BASE}/${encoded}`
}

async function download(rel) {
  const url = toRawUrl(rel)
  const dest = path.join(ROOT, rel)
  await fs.mkdir(path.dirname(dest), { recursive: true })
  const res = await fetch(url)
  if (!res.ok) {
    console.warn(`SKIP ${rel} (${res.status})`)
    return false
  }
  const text = await res.text()
  await fs.writeFile(dest, text, "utf8")
  console.log(`OK ${rel}`)
  return true
}

let ok = 0
let fail = 0
for (const rel of FILES) {
  if (await download(rel)) ok++
  else fail++
}

console.log(`\nDone: ${ok} ok, ${fail} skipped → ${ROOT}`)
