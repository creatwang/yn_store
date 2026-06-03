#!/usr/bin/env node
/**
 * 运行时 DB 池验收（与 check-draft-order-imports 互补，后者只做静态 import）
 *
 * 用法：node scripts/check-runtime-db.mjs
 * 需已配置 apps/server/.env 的 DATABASE_URL
 */
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const envPath = resolve(root, "apps/server/.env")

function loadEnvMax() {
  if (!existsSync(envPath)) return null
  const text = readFileSync(envPath, "utf8")
  const m = text.match(/^\s*DB_POOL_MAX\s*=\s*(\d+)/m)
  return m ? Number(m[1]) : null
}

const poolMax = loadEnvMax()
const effective = poolMax ?? (process.env.VITEST ? 2 : 20)

console.log("[check-runtime-db] Druid 式：maxActive + 应用层排队（DB_MAX_WAIT_MS=0 无限等）")
console.log(
  `[check-runtime-db] 本进程 maxActive=${effective}` +
    (poolMax != null ? " (DB_POOL_MAX)" : " (默认)"),
)
if (effective > 30) {
  console.warn(
    "[check-runtime-db] 警告: DB_POOL_MAX 过大，多 dev/test 进程仍会抢云端总连接",
  )
}

if (!process.env.DATABASE_URL && !existsSync(envPath)) {
  console.warn("[check-runtime-db] 跳过 probe：未找到 DATABASE_URL / .env")
  process.exit(0)
}

const vitest = spawnSync(
  "pnpm",
  [
    "--filter",
    "@my-store/server",
    "exec",
    "vitest",
    "run",
    "tests/admin/dashboard-probe.test.ts",
    "--reporter=dot",
  ],
  { cwd: root, stdio: "inherit", shell: true, env: { ...process.env } },
)

process.exit(vitest.status ?? 1)
