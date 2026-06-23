/**
 * Server 模块 import 路径检查。
 * 用法: node scripts/check-server-imports.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const serverSrc = path.join(root, "apps/server/src")

const EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"]
const STALE_PATTERNS = [
  { re: /lib\/check-db['"]/, msg: "已迁移至 lib/infra/db/check-db" },
  { re: /lib\/event-subscribers['"]/, msg: "已迁移至 lib/infra/events/event-subscribers" },
  { re: /lib\/providers['"]/, msg: "已迁移至 lib/payment/providers" },
  { re: /lib\/query-filters['"]/, msg: "已迁移至 lib/infra/query/query-filters" },
  { re: /lib\/rpc-query-validator['"]/, msg: "已迁移至 lib/infra/query/rpc-query-validator" },
  { re: /lib\/sql-in-ids['"]/, msg: "已迁移至 lib/infra/sql/sql-in-ids" },
  { re: /lib\/slug['"]/, msg: "已迁移至 lib/product/slug" },
  { re: /lib\/product-option-values-batch['"]/, msg: "已迁移至 lib/product/product-option-values-batch" },
]

const errors = []

function rel(p) {
  return path.relative(root, p).replace(/\\/g, "/")
}

function walk(dir, fn) {
  if (!fs.existsSync(dir)) return
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === "node_modules") continue
      walk(p, fn)
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(ent.name)) {
      fn(p)
    }
  }
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith(".")) return true
  const normalized = spec.replace(/\.(ts|tsx|js|jsx)$/, "")
  const target = path.resolve(path.dirname(fromFile), normalized)

  if (fs.existsSync(target) && fs.statSync(target).isFile()) return true
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    for (const ext of EXTENSIONS) {
      if (fs.existsSync(path.join(target, "index" + ext))) return true
    }
  }
  for (const ext of EXTENSIONS) {
    if (fs.existsSync(target + ext)) return true
  }
  return false
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8")
  const relPath = rel(filePath)
  if (relPath.endsWith("/index.ts")) return

  for (const { re, msg } of STALE_PATTERNS) {
    if (re.test(content)) {
      errors.push(`${relPath}: 疑似旧路径 — ${msg}`)
    }
  }

  const importSpecs = [
    ...content.matchAll(/from\s+['"]([^'"]+)['"]/g),
    ...content.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g),
  ]
  for (const [, spec] of importSpecs) {
    if (!spec.startsWith(".")) continue
    if (!resolveImport(filePath, spec)) {
      errors.push(`${relPath}: 无法解析 import "${spec}"`)
    }
  }
}

walk(serverSrc, checkFile)

if (errors.length) {
  console.error("Server import 检查失败:\n")
  for (const e of errors) console.error("  - " + e)
  process.exit(1)
}

console.log("Server import 检查通过")
