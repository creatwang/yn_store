import { loadEnv, maskDatabaseUrl } from "./load-env"
import { getHealthStatus, logHealthToConsole } from "./src/lib/check-db"
import { app, appMount } from "./src/app"
import { logServerStartup } from "./src/lib/log-startup"

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

logServerStartup(port, appMount)

export default {
  port,
  fetch: app.fetch,
}
