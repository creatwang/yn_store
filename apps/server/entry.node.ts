import { loadEnv, maskDatabaseUrl } from "./load-env"
import { serve } from "@hono/node-server"
import { closeDb, describeDbPool } from "@my-store/db"
import { getHealthStatus, logHealthToConsole } from "./src/lib/check-db"
import { app, appMount } from "./src/app"
import { logServerStartup } from "./src/lib/log-startup"

// Node 不会自动读 .env，须在 import app 之前加载（app 依赖 DATABASE_URL 等）
loadEnv()

const dbUrl = process.env.DATABASE_URL
if (dbUrl) {
  console.log(`📦 DATABASE_URL → ${maskDatabaseUrl(dbUrl)}`)
  const pool = describeDbPool(dbUrl)
  console.log(
    `📦 DB pool: max=${pool.max} (${pool.mode}), ${pool.singleton}`,
  )
  if (pool.hint) {
    console.log(`   ${pool.hint}`)
  }
  if (pool.mode === "session-pooler:5432") {
    console.warn(
      "⚠️  :5432 占用 Postgres 直连名额（约十余条）。第 5 个进程/僵尸 idle 易被踢断。" +
        "开发请改 DATABASE_URL 为 pooler :6543（Transaction mode）。",
    )
  }
  if (dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1")) {
    console.warn(
      "⚠️  当前连接指向本机 PostgreSQL。若使用 Supabase，请检查 apps/server/.env 并完整重启 dev。",
    )
  }
}

void getHealthStatus().then(({ payload }) => {
  logHealthToConsole(payload, "startup")
  if (payload.status !== "ok") {
    console.error(
      "   请编辑 apps/server/.env 中的 DATABASE_URL 后执行: pnpm predev && pnpm dev:server"
    )
  }
})

const port = Number(process.env.PORT) || 7000

const server = serve({
  fetch: app.fetch,
  port,
})

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `端口 ${port} 已被占用。请先执行: pnpm predev  或关闭占用该端口的进程。`
    )
    process.exit(1)
  }
  throw err
})

logServerStartup(port, appMount)

let isShuttingDown = false
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return
  isShuttingDown = true
  console.log(`\n${signal}: closing DB pool…`)
  await closeDb()
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 3000).unref()
}

process.on("SIGINT", () => void gracefulShutdown("SIGINT"))
process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"))
