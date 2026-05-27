import { Hono } from "hono"
import { logger } from "hono/logger"
import { getHealthStatus, logHealthToConsole } from "./lib/check-db"
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
import { mountAppSpa } from "./host/mount-app"

/** /api 下所有路由，供 RPC 客户端通过 client.api.* 访问 */
const apiRoutes = new Hono()
  .get("/health", async (c) => {
    const { payload, statusCode } = await getHealthStatus()
    logHealthToConsole(payload, "request")
    return c.json(payload, statusCode)
  })
  .route("/auth", authRoutes)
  .route("/admin/products", adminProducts)
  .route("/admin/orders", adminOrders)
  .route("/admin/customers", adminCustomers)
  .route("/admin/carts", adminCarts)
  .route("/store/products", storeProducts)
  .route("/store/orders", storeOrders)
  .route("/store/carts", storeCarts)
  .route("/store/customers", storeCustomers)

const app = new Hono()
  .onError(errorHandler)
  .use("*", logger())
  .use("*", corsMiddleware)
  .route("/api", apiRoutes)

const appMount = mountAppSpa(app)

export type AppType = typeof app
export { app, appMount }
