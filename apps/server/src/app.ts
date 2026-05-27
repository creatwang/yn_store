import { Hono } from "hono"
import { logger } from "hono/logger"
import { corsMiddleware } from "./middleware/cors"
import { errorHandler } from "./middleware/error-handler"
import { authRoutes } from "./routes/auth"
import { adminProducts } from "./routes/admin/products"
import { storeProducts } from "./routes/store/products"

const app = new Hono()
  .onError(errorHandler)
  .use("*", logger())
  .use("*", corsMiddleware)
  .get("/api/health", (c) =>
    c.json({ status: "ok", timestamp: new Date().toISOString() })
  )
  .route("/api/auth", authRoutes)
  .route("/api/admin/products", adminProducts)
  .route("/api/store/products", storeProducts)

export type AppType = typeof app
export { app }
