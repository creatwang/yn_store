/**
 * 从 demo/dashboard 复制订单/商品仍为 stub 的组件目录，并做 import 路径适配。
 */
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const DEMO = path.join(REPO, "apps", "admin", "demo", "dashboard", "src", "routes")
const SRC = path.join(REPO, "apps", "admin", "src", "routes")

function transformContent(text) {
  return text
    .replaceAll("../../lib/queries/sdk", "../../lib/client")
    .replaceAll("../../../lib/queries/sdk", "../../../lib/client")
    .replaceAll("../../../../lib/queries/sdk", "../../../../lib/client")
    .replaceAll("../../../../../lib/queries/sdk", "../../../../../lib/client")
    .replaceAll("../../lib/data/currencies", "../../lib/money-amount-helpers")
    .replaceAll("../../../lib/data/currencies", "../../../lib/money-amount-helpers")
    .replaceAll("../../../../lib/data/currencies", "../../../../lib/money-amount-helpers")
    .replaceAll(
      "../../../../components/common/data-table",
      "../../../../components/data-table",
    )
    .replaceAll(
      "../../../components/common/data-table",
      "../../../components/data-table",
    )
    .replaceAll(
      "../../components/common/data-table",
      "../../components/data-table",
    )
    .replaceAll(
      "../../../components/common/page-skeleton",
      "../../../components/common/skeleton",
    )
    .replaceAll(
      /from "(\.\.\/)+hooks\/common\/use-data-table-date-filters"/g,
      'from "../../../components/data-table/helpers/general/use-data-table-date-filters"',
    )
    .replaceAll(
      /from "(\.\.\/)+hooks\/common\/use-query-params"/g,
      'from "../../../hooks/use-query-params"',
    )
    .replaceAll(
      /from "(\.\.\/)+hooks\/common\/use-combobox-data"/g,
      'from "../../../hooks/use-combobox-data"',
    )
    .replaceAll(
      /from "(\.\.\/)+hooks\/common\/use-debounced-search"/g,
      'from "../../../hooks/use-debounced-search"',
    )
    .replaceAll("PageSkeleton", "TwoColumnPageSkeleton")
}

const COPY_DIRS = [
  "orders/order-create-fulfillment/components/order-create-fulfillment-form",
  "orders/order-edit-shipping-address/components/edit-order-shipping-address-form",
  "orders/order-edit-billing-address/components/edit-order-billing-address-form",
  "orders/order-create-exchange/components/add-exchange-inbound-items-table",
  "orders/order-balance-settlement/components/order-balance-settlement-form",
  "products/product-shipping-profile/components/product-organization-form",
  "products/product-detail/components/product-shipping-profile-section",
  "product-variants/product-variant-manage-inventory-items/components/manage-variant-inventory-items-form",
]

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []
  for (const e of entries) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      files.push(...(await walk(p)))
    } else {
      files.push(p)
    }
  }
  return files
}

for (const rel of COPY_DIRS) {
  const demoDir = path.join(DEMO, rel)
  const destDir = path.join(SRC, rel)
  const files = await walk(demoDir)
  for (const file of files) {
    const relFile = path.relative(demoDir, file)
    const destPath = path.join(destDir, relFile)
    let content = await fs.readFile(file, "utf8")
    content = transformContent(content)
    if (
      (file.endsWith(".tsx") || file.endsWith(".ts")) &&
      !content.startsWith("// @ts-nocheck")
    ) {
      content = `// @ts-nocheck\n${content}`
    }
    await fs.mkdir(path.dirname(destPath), { recursive: true })
    await fs.writeFile(destPath, content, "utf8")
    console.log(`PORT ${path.join(rel, relFile)}`)
  }
}

console.log("\nOrders/products stub port complete.")
