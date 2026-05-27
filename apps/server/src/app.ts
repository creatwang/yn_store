import { Hono } from "hono"
import { logger } from "hono/logger"
import { corsMiddleware } from "./middleware/cors"
import { errorHandler } from "./middleware/error-handler"
import { authRoutes } from "./routes/auth"
import { adminProducts } from "./routes/admin/products"
import { adminOrders } from "./routes/admin/orders"
import { adminCustomers } from "./routes/admin/customers"
import { adminCarts } from "./routes/admin/carts"
import { storeProducts } from "./routes/store/products"
import { storeOrders } from "./routes/store/orders"
import { storeCarts } from "./routes/store/carts"
import { storeCustomers } from "./routes/store/customers"

const app = new Hono()
  .onError(errorHandler)
  .use("*", logger())
  .use("*", corsMiddleware)
  .get("/api/health", (c) =>
    c.json({ status: "ok", timestamp: new Date().toISOString() })
  )
  .route("/api/auth", authRoutes)
  .route("/api/admin/products", adminProducts)
  .route("/api/admin/orders", adminOrders)
  .route("/api/admin/customers", adminCustomers)
  .route("/api/admin/carts", adminCarts)
  .route("/api/store/products", storeProducts)
  .route("/api/store/orders", storeOrders)
  .route("/api/store/carts", storeCarts)
  .route("/api/store/customers", storeCustomers)

export type AppType = typeof app
export { app }
