/**
 * Storefront 客户端/服务端边界检查。
 * 用法: node scripts/check-storefront-boundaries.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const storefrontSrc = path.join(root, "apps/storefront/src")

const errors = []

function walk(dir, fn) {
  if (!fs.existsSync(dir)) return
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === "node_modules") continue
      walk(p, fn)
    } else if (/\.(astro|ts|tsx|js|mjs)$/.test(ent.name)) {
      fn(p)
    }
  }
}

function rel(p) {
  return path.relative(root, p).replace(/\\/g, "/")
}

function checkClientScripts(filePath, content) {
  const scriptBlocks = [...content.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  for (const [, body] of scriptBlocks) {
    if (!body.includes("import ")) continue
    const relPath = rel(filePath)

    if (/from\s+['"][^'"]*lib\/i18n['"]/.test(body)) {
      errors.push(`${relPath}: client <script> 禁止 import lib/i18n barrel，请用 lib/i18n/locale`)
    }
    if (/from\s+['"][^'"]*lib\/i18n\/server['"]/.test(body)) {
      errors.push(`${relPath}: client <script> 禁止 import lib/i18n/server`)
    }
    if (/from\s+['"][^'"]*lib\/catalog\/server['"]/.test(body)) {
      errors.push(`${relPath}: client <script> 禁止 import lib/catalog/server`)
    }
    if (/store-api/.test(body)) {
      errors.push(`${relPath}: client <script> 使用了已废弃路径 store-api，请改为 lib/api`)
    }
    if (/astro:content/.test(body)) {
      errors.push(`${relPath}: client <script> 禁止 import astro:content`)
    }
  }
}

function checkServerOnlyModules(filePath, content) {
  const relPath = rel(filePath)
  if (content.includes('from "astro:content"') || content.includes("from 'astro:content'")) {
    const allowed =
      relPath.includes("apps/storefront/src/lib/i18n/catalog-resolver") ||
      relPath.includes("apps/storefront/src/lib/i18n/static-paths") ||
      relPath.includes("apps/storefront/src/lib/i18n/server.ts") ||
      relPath.endsWith("apps/storefront/src/content.config.ts")
    if (!allowed) {
      errors.push(`${relPath}: astro:content 只能出现在 lib/i18n/server 链或 content.config.ts`)
    }
  }
}

function checkBarrelExports(filePath, content) {
  const relPath = rel(filePath)
  if (!relPath.endsWith("/index.ts")) return
  if (relPath.includes("lib/i18n/index.ts")) {
    if (/catalog-resolver|static-paths|astro:content/.test(content)) {
      errors.push(`${relPath}: i18n/index 不得 re-export server-only 模块`)
    }
  }
  if (relPath.includes("lib/catalog/index.ts")) {
    if (/fetchAllPaginated|fetchStoreJson|listProducts/.test(content)) {
      errors.push(`${relPath}: catalog/index 只能导出类型，API 拉取放 catalog/server.ts`)
    }
  }
}

function checkBrokenPaths(filePath, content) {
  const relPath = rel(filePath)
  if (/lib\/store-api|lib\/images['"]/.test(content)) {
    errors.push(`${relPath}: 存在已迁移路径 store-api 或 lib/images，请改为 lib/api 或 lib/media/images`)
  }
}

walk(storefrontSrc, (filePath) => {
  const content = fs.readFileSync(filePath, "utf8")
  if (filePath.endsWith(".astro")) {
    checkClientScripts(filePath, content)
  }
  checkServerOnlyModules(filePath, content)
  checkBarrelExports(filePath, content)
  checkBrokenPaths(filePath, content)
})

if (errors.length) {
  console.error("Storefront boundary check failed:\n")
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}

console.log("Storefront boundary check passed.")
