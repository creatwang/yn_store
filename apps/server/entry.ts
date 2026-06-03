/**
 * 生产 / Bun compile 入口（与 entry.node.ts 相同）
 */
import { loadEnv } from "./load-env"
import { serve } from "@hono/node-server"
import { closeDb } from "@my-store/db"
import { getHealthStatus, logHealthToConsole } from "./src/lib/check-db"
import { logDbPoolAtStartup } from "./src/lib/log-db-pool"
import { app, appMount } from "./src/app"
import { logServerStartup } from "./src/lib/log-startup"

loadEnv()

const dbUrl = process.env.DATABASE_URL
if (dbUrl) {
  logDbPoolAtStartup(dbUrl)
}

void getHealthStatus().then(({ payload }) => {
  logHealthToConsole(payload, "startup")
  if (payload.status !== "ok") {
    console.error("   请配置 apps/server/.env 中的 DATABASE_URL")
  }
})

const port = Number(process.env.PORT) || 7000

const server = serve({
  fetch: app.fetch,
  port,
})

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`端口 ${port} 已被占用。`)
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
