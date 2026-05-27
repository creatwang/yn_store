import { serve } from "@hono/node-server"
import { app } from "./src/app"

const port = Number(process.env.PORT) || 9000

console.log(`🚀 Server (Node) running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})
