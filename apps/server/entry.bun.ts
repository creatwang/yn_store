import { app } from "./src/app"

const port = Number(process.env.PORT) || 9000

console.log(`🚀 Server running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
