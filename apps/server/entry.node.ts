import { loadEnv } from "./load-env"
import { serve } from "@hono/node-server"
import { app } from "./src/app"

// Node 不会自动读 .env，须在 import app 之前加载（app 依赖 DATABASE_URL 等）
loadEnv()

const port = Number(process.env.PORT) || 9000

console.log(`🚀 Server (Node) running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})
