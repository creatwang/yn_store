import { loadEnv } from "./load-env"
import { closeDb } from "@my-store/db"
import { getHealthStatus, logHealthToConsole } from "./src/lib/infra/db/check-db"
import { logDbPoolAtStartup } from "./src/lib/infra/db/log-db-pool"
import { app, appMount } from "./src/app"
import { logServerStartup } from "./src/lib/infra/db/log-startup"
import { ensureDefaultPaymentProviders } from "./src/lib/payment/ensure-payment-providers"

// Bun 会自动读 .env；显式调用以便与 Node 入口行为一致，且不覆盖已有 env
loadEnv()

const port = Number(process.env.PORT) || 7000

const dbUrl = process.env.DATABASE_URL
if (dbUrl) {
  logDbPoolAtStartup(dbUrl)
}

process.on("beforeExit", () => void closeDb())

void ensureDefaultPaymentProviders().catch((err) => {
  console.warn("[startup] ensureDefaultPaymentProviders:", err)
})

void getHealthStatus().then(({ payload }) => {
  logHealthToConsole(payload, "startup")
})

logServerStartup(port, appMount)

export default {
  port,
  fetch: app.fetch,
}
