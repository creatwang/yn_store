/**
 * 生产 / Bun compile 入口（与 entry.node.ts 相同）
 */
import { loadEnv, maskDatabaseUrl } from "./load-env"
import { serve } from "@hono/node-server"
import { getHealthStatus, logHealthToConsole } from "./src/lib/check-db"
import { app, appMount } from "./src/app"

loadEnv()

const dbUrl = process.env.DATABASE_URL
if (dbUrl) {
  console.log(`📦 DATABASE_URL → ${maskDatabaseUrl(dbUrl)}`)
  if (dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1")) {
    console.warn(
      "⚠️  当前连接指向本机 PostgreSQL。若使用 Supabase，请检查 apps/server/.env 并完整重启。"
    )
  }
}

void getHealthStatus().then(({ payload }) => {
  logHealthToConsole(payload, "startup")
  if (payload.status !== "ok") {
    console.error("   请配置 apps/server/.env 中的 DATABASE_URL")
  }
})

const port = Number(process.env.PORT) || 9000

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

console.log(`🚀 Server running on http://localhost:${port}`)
console.log(`   健康检查: http://localhost:${port}/api/health`)
if (appMount.mounted) {
  console.log(`   管理后台: http://localhost:${port}/app/`)
  console.log(`   静态目录: ${appMount.distDir}`)
} else {
  console.log("   管理后台: 未挂载（执行 pnpm build:admin）")
}
