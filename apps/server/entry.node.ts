import { loadEnv } from "./load-env"
import { serve } from "@hono/node-server"
import { closeDb } from "@my-store/db"
import { getHealthStatus, logHealthToConsole } from "./src/lib/infra/db/check-db"
import { logDbPoolAtStartup } from "./src/lib/infra/db/log-db-pool"
import { app, appMount } from "./src/app"
import { logServerStartup } from "./src/lib/infra/db/log-startup"
import { ensureDefaultPaymentProviders } from "./src/lib/payment/ensure-payment-providers"

// Node 不会自动读 .env，须在 import app 之前加载（app 依赖 DATABASE_URL 等）
loadEnv()

const dbUrl = process.env.DATABASE_URL
if (dbUrl) {
  logDbPoolAtStartup(dbUrl)
}

void ensureDefaultPaymentProviders().catch((err) => {
  console.warn("[startup] ensureDefaultPaymentProviders:", err)
})

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
