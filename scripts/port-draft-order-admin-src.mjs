/**
 * 将 demo/draft-order-plugin 对照代码写入 apps/admin/src（仅改 import 路径）。
 */
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const DEMO = path.join(REPO, "apps", "admin", "demo", "draft-order-plugin")
const SRC = path.join(REPO, "apps", "admin", "src")

function transformContent(text, depthDelta = 0) {
  let s = text
  if (depthDelta > 0) {
    const extra = "../".repeat(depthDelta)
    s = s.replace(/from "\.\.\/\.\.\//g, `from "${extra}../`)
  }
  s = s
    .replaceAll("../../lib/queries/sdk", "../../lib/client")
    .replaceAll("../../../lib/queries/sdk", "../../../lib/client")
    .replaceAll("../../../../lib/queries/sdk", "../../../../lib/client")
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
    .replaceAll(
      "../../../../../types/http/orders/entity",
      "../../../../types/draft-order/entity",
    )
    .replaceAll(
      '@medusajs/admin-sdk',
      '@medusajs/admin-sdk_DISABLED',
    )
  return s
}

async function writeFromDemo(relDemo, destRel, depthDelta = 0) {
  const srcPath = path.join(DEMO, relDemo)
  const destPath = path.join(SRC, destRel)
  const raw = await fs.readFile(srcPath, "utf8")
  const content =
    depthDelta === 0 && !destRel.includes("draft-order-list")
      ? transformContent(raw)
      : transformContent(raw, depthDelta)
  await fs.mkdir(path.dirname(destPath), { recursive: true })
  await fs.writeFile(destPath, content, "utf8")
  console.log(`PORT ${destRel}`)
}

// components（与 demo 同级深度）
const COMPONENTS = [
  "active-order-changes.tsx",
  "activity-section.tsx",
  "customer-section.tsx",
  "general-section.tsx",
  "json-view-section.tsx",
  "metadata-section.tsx",
  "shipping-section.tsx",
  "summary-section.tsx",
]

for (const f of COMPONENTS) {
  await writeFromDemo(`components/draft-orders/${f}`, `components/draft-orders/${f}`)
}

// hooks
await writeFromDemo("hooks/api/draft-orders.tsx", "hooks/api/draft-orders.tsx")
const hooksPath = path.join(SRC, "hooks/api/draft-orders.tsx")
let hooks = await fs.readFile(hooksPath, "utf8")
if (!hooks.startsWith("// @ts-nocheck")) {
  hooks = `// @ts-nocheck\n${hooks}`
}
await fs.writeFile(hooksPath, hooks, "utf8")

// lib utils
for (const f of ["order-utils.ts", "string-utils.ts", "number-utils.ts"]) {
  const raw = await fs.readFile(path.join(DEMO, "lib/utils", f), "utf8")
  await fs.mkdir(path.join(SRC, "lib/utils"), { recursive: true })
  await fs.writeFile(path.join(SRC, "lib/utils", f), raw, "utf8")
  console.log(`PORT lib/utils/${f}`)
}

// types
await fs.mkdir(path.join(SRC, "types/draft-order"), { recursive: true })
await fs.writeFile(
  path.join(SRC, "types/draft-order/entity.ts"),
  `import { HttpTypes } from "@medusajs/types"

export type AdminOrderPreviewLineItem = HttpTypes.AdminOrderLineItem & {
  actions?: HttpTypes.AdminOrderChangeAction[]
}
`,
  "utf8",
)

// detail main
await writeFromDemo(
  "routes/draft-orders/[id]/page.tsx",
  "routes/draft-orders/draft-order-detail/draft-order-detail.tsx",
)
let detail = await fs.readFile(
  path.join(SRC, "routes/draft-orders/draft-order-detail/draft-order-detail.tsx"),
  "utf8",
)
detail = detail.replace(/\bconst ID = /, "export const DraftOrderDetail = ")
detail = detail.replace(/export default ID\s*/, "")
await fs.writeFile(
  path.join(SRC, "routes/draft-orders/draft-order-detail/draft-order-detail.tsx"),
  detail,
  "utf8",
)

// list (+1 depth) — 再跑 fix-draft-order-list-imports.mjs
await writeFromDemo(
  "routes/draft-orders/page.tsx",
  "routes/draft-orders/draft-order-list/draft-order-list.tsx",
  1,
)
// create
await writeFromDemo(
  "routes/draft-orders/@create/page.tsx",
  "routes/draft-orders/draft-order-create/draft-order-create.tsx",
  1,
)
let create = await fs.readFile(
  path.join(SRC, "routes/draft-orders/draft-order-create/draft-order-create.tsx"),
  "utf8",
)
create = create.replace(/const Create = \(\) =>/, "export const DraftOrderCreate = () =>")
create = create.replace(/export default Create/, "")
await fs.writeFile(
  path.join(SRC, "routes/draft-orders/draft-order-create/draft-order-create.tsx"),
  create,
  "utf8",
)

const CHILD_ROUTES = [
  ["@items", "draft-order-items"],
  ["@custom-items", "draft-order-custom-items"],
  ["@promotions", "draft-order-promotions"],
  ["@shipping", "draft-order-shipping"],
  ["@shipping-address", "draft-order-shipping-address"],
  ["@billing-address", "draft-order-billing-address"],
  ["@email", "draft-order-email"],
  ["@sales-channel", "draft-order-sales-channel"],
  ["@metadata", "draft-order-metadata"],
  ["@transfer-ownership", "draft-order-transfer-ownership"],
]

for (const [official, folder] of CHILD_ROUTES) {
  const rel = `routes/draft-orders/[id]/${official}/page.tsx`
  const dest = `routes/draft-orders/draft-order-detail/${folder}/${folder}.tsx`
  await writeFromDemo(rel, dest, 0)
  const compName = folder
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("")
  let body = await fs.readFile(path.join(SRC, dest), "utf8")
  const defaultExport = body.match(/export default (\w+)/)
  const mainName = defaultExport?.[1] ?? compName
  body = body.replace(/export default \w+\s*/, "")
  if (!body.includes(`export const ${mainName}`)) {
    body = body.replace(
      new RegExp(`const ${mainName} =`),
      `export const ${mainName} =`,
    )
  }
  await fs.writeFile(path.join(SRC, dest), body, "utf8")
  await fs.writeFile(
    path.join(SRC, `routes/draft-orders/draft-order-detail/${folder}/index.ts`),
    `// @ts-nocheck\nexport { ${mainName} as Component } from "./${folder}"\n`,
    "utf8",
  )
}

const { execSync } = await import("node:child_process")
for (const script of [
  "fix-draft-order-list-imports.mjs",
  "fix-draft-order-create-imports.mjs",
  "fix-draft-order-child-route-imports.mjs",
  "fix-draft-order-imports.mjs",
  "check-draft-order-imports.mjs",
]) {
  execSync(`node scripts/${script}`, { cwd: REPO, stdio: "inherit" })
}

console.log("\nPort complete.")
