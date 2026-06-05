/**
 * 验证路由入口能否被 Vite transform（不启动 dev server）
 * 用法：node scripts/verify-vite-transform.mjs
 */
import { createServer } from "vite"
import { readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const adminRoot = fileURLToPath(new URL("..", import.meta.url))
const routesRoot = join(adminRoot, "src/routes")

function collectListIndexFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      const indexPath = join(full, "index.ts")
      if (name.endsWith("-list")) {
        try {
          if (statSync(indexPath).isFile()) acc.push(indexPath)
        } catch {
          /* 部分 *-list 目录无 index.ts */
        }
      } else {
        collectListIndexFiles(full, acc)
      }
    }
  }
  return acc
}

const extraEntries = [
  "tax-regions/tax-region-tax-rate-create/index.ts",
  "shipping-profiles/shipping-profiles-list/components/shipping-profile-list-table/index.ts",
  "product-types/product-type-detail/components/product-type-general-section/index.ts",
  "products/product-create/components/product-create-inventory-kit-form/index.ts",
].map((p) => join(routesRoot, p))

const entryFiles = [
  ...collectListIndexFiles(routesRoot),
  ...extraEntries.filter((p) => {
    try {
      return statSync(p).isFile()
    } catch {
      return false
    }
  }),
]

const server = await createServer({
  configFile: join(adminRoot, "vite.config.ts"),
  logLevel: "error",
})

let failed = 0
for (const file of entryFiles.sort()) {
  const id =
    "/src/" + relative(join(adminRoot, "src"), file).replace(/\\/g, "/")
  try {
    const result = await server.transformRequest(id)
    if (!result?.code) throw new Error("empty transform result")
    console.log("OK", id)
  } catch (e) {
    failed++
    console.log("FAIL", id, (e?.message ?? e).toString().slice(0, 300))
  }
}

await server.close()
console.log(`\n${entryFiles.length} entries, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
