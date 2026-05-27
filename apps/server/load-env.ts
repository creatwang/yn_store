/**
 * 加载 apps/server/.env 到 process.env。
 *
 * - Bun（entry.bun.ts）也会调用，与 Bun 自带 .env 加载结果以本文件为准（见下方覆盖规则）。
 * - Node + tsx 必须显式调用，否则 DATABASE_URL 等为空。
 *
 * 覆盖规则：
 * - DATABASE_URL、JWT_SECRET：若 .env 中有定义，**始终以 .env 为准**（避免终端里残留 localhost 旧变量）。
 * - 其余变量：仅当 process.env 未设置时才从 .env 写入。
 */
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const serverRoot = dirname(fileURLToPath(import.meta.url))

/** 必须从 .env 文件覆盖的值（防止 shell 残留开发机旧配置） */
const ALWAYS_FROM_FILE = new Set(["DATABASE_URL", "JWT_SECRET"])

export function maskDatabaseUrl(url: string): string {
  try {
    const u = new URL(url)
    if (u.password) u.password = "****"
    if (u.username) u.username = u.username.replace(/[^.]+$/, "****")
    return u.toString()
  } catch {
    return "(invalid DATABASE_URL)"
  }
}

export function loadEnv() {
  const envPath = resolve(serverRoot, ".env")
  if (!existsSync(envPath)) return

  const parsed: Record<string, string> = {}

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const eq = trimmed.indexOf("=")
    if (eq === -1) continue

    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    parsed[key] = value
  }

  for (const [key, value] of Object.entries(parsed)) {
    if (ALWAYS_FROM_FILE.has(key) || process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}
