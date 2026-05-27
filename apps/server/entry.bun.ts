import { loadEnv } from "./load-env"
import { app } from "./src/app"

// Bun 会自动读 .env；显式调用以便与 Node 入口行为一致，且不覆盖已有 env
loadEnv()

const port = Number(process.env.PORT) || 9000

console.log(`🚀 Server running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
