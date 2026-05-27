import { loadEnv, maskDatabaseUrl } from "./load-env"
import { getHealthStatus, logHealthToConsole } from "./src/lib/check-db"
import { app, appMount } from "./src/app"

// Bun 会自动读 .env；显式调用以便与 Node 入口行为一致，且不覆盖已有 env
loadEnv()

const port = Number(process.env.PORT) || 9000

const dbUrl = process.env.DATABASE_URL
if (dbUrl) {
  console.log(`📦 DATABASE_URL → ${maskDatabaseUrl(dbUrl)}`)
}

void getHealthStatus().then(({ payload }) => {
  logHealthToConsole(payload, "startup")
})

console.log(`🚀 Server running on http://localhost:${port}`)
console.log(`   健康检查: http://localhost:${port}/api/health`)
if (appMount.mounted) {
  console.log(`   管理后台: http://localhost:${port}/app/`)
} else {
  console.log("   管理后台: 未挂载（需 pnpm build:admin）")
}

export default {
  port,
  fetch: app.fetch,
}
