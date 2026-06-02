#!/usr/bin/env node
/**
 * Sync Zod validators from Medusa v2.15.3 official source into packages/validators.
 *
 * Usage: node scripts/sync-validators-from-medusa.mjs [--tag v2.15.3]
 */
import { mkdir, writeFile, rm } from "node:fs/promises"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")
const DEST = join(ROOT, "packages/validators/src/medusa")
const TAG = process.argv.includes("--tag")
  ? process.argv[process.argv.indexOf("--tag") + 1]
  : "v2.15.3"

const GITHUB_RAW = `https://raw.githubusercontent.com/medusajs/medusa/${TAG}`

async function fetchTree() {
  const res = await fetch(
    `https://api.github.com/repos/medusajs/medusa/git/trees/${TAG}?recursive=1`,
    { headers: { "User-Agent": "my-store-sync-validators" } }
  )
  if (!res.ok) throw new Error(`GitHub tree fetch failed: ${res.status}`)
  const data = await res.json()
  return data.tree
    .map((n) => n.path)
    .filter(
      (p) =>
        p.startsWith("packages/medusa/src/api/") &&
        !p.startsWith("packages/medusa/src/api/utils/") &&
        (p.endsWith("/validators.ts") || p.endsWith("/validators/geo-zone.ts"))
    )
}

function helpersPrefix(medusaRelPath) {
  const dir = dirname(medusaRelPath.replace(/\\/g, "/"))
  const segments = dir === "." ? 0 : dir.split("/").filter(Boolean).length
  return "../".repeat(segments + 1) + "helpers/"
}

function transformSource(content, medusaRelPath) {
  const hp = helpersPrefix(medusaRelPath)

  let out = content
    .replace(/from "@medusajs\/framework\/zod"/g, 'from "zod"')
    .replace(
      /import { z, type ZodType } from "@medusajs\/framework\/zod"/g,
      'import { z, type ZodType } from "zod"'
    )
    .replace(/@medusajs\/framework\/utils/g, `${hp}framework-utils`)
    .replace(/@medusajs\/framework\/types/g, `${hp}types`)
    .replace(/@medusajs\/types/g, `${hp}types`)
    .replace(/@medusajs\/utils/g, `${hp}framework-utils`)
    .replace(/(?:\.\.\/)+utils\/validators/g, `${hp}validators`)
    .replace(/(?:\.\.\/)+utils\/common-validators/g, `${hp}common-validators`)

  // Sync header
  out = `/** Auto-synced from medusajs/medusa ${TAG} — do not edit manually */\n${out}`
  return out
}

async function download(path) {
  const url = `${GITHUB_RAW}/${path}`
  const res = await fetch(url, { headers: { "User-Agent": "my-store-sync-validators" } })
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`)
  return res.text()
}

async function main() {
  console.log(`Syncing validators from medusajs/medusa ${TAG}...`)

  await rm(DEST, { recursive: true, force: true })

  const paths = await fetchTree()
  console.log(`Found ${paths.length} source files`)

  let ok = 0
  let fail = 0

  for (const srcPath of paths) {
    const medusaRel = relative("packages/medusa/src/api", srcPath)
    const destPath = join(DEST, medusaRel)
    try {
      const raw = await download(srcPath)
      const transformed = transformSource(raw, medusaRel)
      await mkdir(dirname(destPath), { recursive: true })
      await writeFile(destPath, transformed, "utf8")
      ok++
      process.stdout.write(".")
    } catch (e) {
      fail++
      console.error(`\nFAIL ${srcPath}: ${e.message}`)
    }
  }

  console.log(`\nDone: ${ok} synced, ${fail} failed → ${relative(ROOT, DEST)}`)
  console.log(`Import: @my-store/validators/medusa/<admin|store>/.../validators`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
