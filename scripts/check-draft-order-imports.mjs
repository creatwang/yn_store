/**
 * 扫描 routes/draft-orders 下所有相对 import，检查目标文件是否存在。
 * 用法: node scripts/check-draft-order-imports.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const SRC = path.join(REPO, "apps/admin/src")
const DRAFT_ROOT = path.join(SRC, "routes/draft-orders")

const IMPORT_RE =
  /from\s+["'](\.[^"']+)["']/g

const TRY_EXTENSIONS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]

function resolveImport(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec)
  for (const ext of TRY_EXTENSIONS) {
    const candidate = base + ext
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, out)
    else if (/\.(tsx?|jsx?)$/.test(ent.name)) out.push(p)
  }
  return out
}

const missing = []
for (const file of walk(DRAFT_ROOT)) {
  const content = fs.readFileSync(file, "utf8")
  let m
  while ((m = IMPORT_RE.exec(content)) !== null) {
    const spec = m[1]
    if (!spec.startsWith(".")) continue
    const resolved = resolveImport(file, spec)
    if (!resolved) {
      missing.push({
        file: path.relative(REPO, file),
        spec,
        line: content.slice(0, m.index).split("\n").length,
      })
    }
  }
}

if (missing.length === 0) {
  console.log("OK: draft-orders 下所有相对 import 均可解析")
  process.exit(0)
}

console.error(`FAIL: ${missing.length} 个 import 无法解析\n`)
for (const item of missing) {
  console.error(`  ${item.file}:${item.line}`)
  console.error(`    -> ${item.spec}\n`)
}
process.exit(1)
