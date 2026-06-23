/**
 * Admin 模块 import 路径检查：解析相对路径与 @/ 别名，发现 lib 重组后的失效引用。
 * 用法: node scripts/check-admin-imports.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const adminSrc = path.join(root, "apps/admin/src")

const EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"]
const STALE_PATTERNS = [
  { re: /lib\/query-client['"]/, msg: "已迁移至 @/lib/query" },
  { re: /lib\/lazy-route['"]/, msg: "已迁移至 @/lib/routing" },
  { re: /from\s+['"]\.\.\/order-helpers['"]/, msg: "已迁移至 @/lib/orders" },
  { re: /from\s+['"]\.\/order-helpers['"]/, msg: "已迁移至 @/lib/orders" },
  { re: /lib\/format-provider/, msg: "已迁移至 @/lib/shipping/format-provider" },
  { re: /lib\/percentage-helpers/, msg: "已迁移至 @/lib/money/percentage-helpers" },
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
      if (ent.name === "node_modules" || ent.name === "dashboard-ui") continue
      walk(p, fn)
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(ent.name)) {
      fn(p)
    }
  }
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith(".") && !spec.startsWith("@/")) return true
  const normalized = spec.replace(/\.(ts|tsx|js|jsx)$/, "")
  let target
  if (normalized.startsWith("@/")) {
    target = path.join(adminSrc, normalized.slice(2))
  } else {
    target = path.resolve(path.dirname(fromFile), normalized)
  }

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
    if (spec.startsWith("@medusajs") || spec.startsWith("@tanstack")) continue
    if (spec.startsWith("@my-store")) continue
    if (spec.startsWith("@/components") || spec.startsWith("@/hooks")) continue
    if (!spec.startsWith(".") && !spec.startsWith("@/")) continue
    if (!resolveImport(filePath, spec)) {
      errors.push(`${relPath}: 无法解析 import "${spec}"`)
    }
  }
}

walk(adminSrc, checkFile)

if (errors.length) {
  console.error("Admin import 检查失败:\n")
  for (const e of errors) console.error("  - " + e)
  process.exit(1)
}

console.log("Admin import 检查通过")
