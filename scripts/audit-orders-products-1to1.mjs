/**
 * 订单/商品 Admin 与 Server 对照自检（Medusa v2.15.3 关键路径）。
 * 用法: node scripts/audit-orders-products-1to1.mjs
 */
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const RETURNS_ROUTES = path.join(REPO, "apps/server/src/routes/admin/returns.ts")
const ADMIN_APP = path.join(REPO, "apps/admin/src/app.tsx")
const ADMIN_ROUTES = path.join(REPO, "apps/admin/src/routes")

const OFFICIAL_RETURN_ROUTES = [
  ["POST", "/:id/dismiss-items"],
  ["POST", "/:id/dismiss-items/:actionId"],
  ["DELETE", "/:id/dismiss-items/:actionId"],
  ["POST", "/:id/receive-items"],
  ["POST", "/:id/receive/confirm"],
]

const ORDER_STUB_PATHS = [
  "orders/order-create-fulfillment/components/order-create-fulfillment-form/order-create-fulfillment-form.tsx",
  "orders/order-edit-shipping-address/components/edit-order-shipping-address-form/edit-order-shipping-address-form.tsx",
  "orders/order-edit-billing-address/components/edit-order-billing-address-form/edit-order-billing-address-form.tsx",
  "orders/order-create-exchange/components/add-exchange-inbound-items-table/add-exchange-inbound-items-table.tsx",
  "orders/order-balance-settlement/components/order-balance-settlement-form/order-balance-settlement-form.tsx",
]

const PRODUCT_STUB_PATHS = [
  "products/product-detail/components/product-shipping-profile-section/product-shipping-profile-section.tsx",
  "products/product-shipping-profile/components/product-organization-form/product-shipping-profile-form.tsx",
  "product-variants/product-variant-manage-inventory-items/components/manage-variant-inventory-items-form/manage-variant-inventory-items-form.tsx",
]

async function read(rel) {
  return fs.readFile(path.join(REPO, rel), "utf8")
}

async function main() {
  const errors = []
  const returnsSrc = await read("apps/server/src/routes/admin/returns.ts")
  for (const [method, p] of OFFICIAL_RETURN_ROUTES) {
    const m = method.toLowerCase()
    const ok =
      returnsSrc.includes(`.${m}("${p}"`) ||
      returnsSrc.includes(`.${m}(\n    "${p}"`)
    if (!ok) errors.push(`returns 缺少路由: ${method} ${p}`)
  }

  const appSrc = await read("apps/admin/src/app.tsx")
  if (appSrc.includes(":fulfillmentId/create-shipment")) {
    errors.push("app.tsx 仍使用 :fulfillmentId，应为官方 :f_id")
  }
  if (!appSrc.includes(":f_id/create-shipment")) {
    errors.push("app.tsx 缺少 :f_id/create-shipment 路由")
  }

  const clientSrc = await read("apps/admin/src/lib/client.ts")
  if (clientSrc.includes('["receive-items"], body, { id })') &&
      clientSrc.includes("dismissItems")) {
    const dismissBlock = clientSrc.slice(
      clientSrc.indexOf("dismissItems"),
      clientSrc.indexOf("dismissItems") + 200,
    )
    if (dismissBlock.includes("receive-items")) {
      errors.push("client.ts dismissItems 仍指向 receive-items")
    }
  }

  for (const rel of [...ORDER_STUB_PATHS, ...PRODUCT_STUB_PATHS]) {
    const file = path.join(ADMIN_ROUTES, rel)
    let src
    try {
      src = await fs.readFile(file, "utf8")
    } catch {
      errors.push(`缺少文件: routes/${rel}`)
      continue
    }
    if (/export const stub\s*=\s*\{\}/.test(src)) {
      errors.push(`仍为 stub: routes/${rel}`)
    }
  }

  if (errors.length) {
    console.error("orders/products 1:1 审计失败\n")
    errors.forEach((e) => console.error(`  - ${e}`))
    process.exit(1)
  }

  console.log("OK: returns dismiss-items、订单/商品关键表单、:f_id 路由均已对齐")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
