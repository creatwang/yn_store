/**
 * 加载 apps/server/.env 到 process.env。
 *
 * - Bun（entry.bun.ts）会自动读 .env，此处调用无害，且不会覆盖已有变量。
 * - Node + tsx（entry.node.ts）不会自动读 .env，必须显式调用，否则
 *   DATABASE_URL、JWT_SECRET 等为空，getDb() / signToken() 会报错。
 *
 * 优先级：系统/终端已设置的环境变量 > .env 文件中的值。
 */
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const serverRoot = dirname(fileURLToPath(import.meta.url))

export function loadEnv() {
  const envPath = resolve(serverRoot, ".env")
  if (!existsSync(envPath)) return

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const eq = trimmed.indexOf("=")
    if (eq === -1) continue

    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    // 去掉首尾引号，兼容 KEY="value" 写法
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    // 不覆盖已在环境中的变量（便于 CI / 本地临时覆盖）
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}
