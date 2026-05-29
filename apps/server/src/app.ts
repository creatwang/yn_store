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
import { adminRegions } from "./routes/admin/regions"
import { adminSalesChannels } from "./routes/admin/sales-channels"
import { adminProductVariants } from "./routes/admin/product-variants"
import { adminProductOptions } from "./routes/admin/product-options"
import { adminProductImages } from "./routes/admin/product-images"
import { adminStockLocations } from "./routes/admin/stock-locations"
import { adminInventoryItems } from "./routes/admin/inventory-items"
import { adminUploads } from "./routes/admin/uploads"
import { adminStore } from "./routes/admin/store"
import { adminPayments } from "./routes/admin/payments"
import { adminReturns } from "./routes/admin/returns"
import { adminClaims } from "./routes/admin/claims"
import { adminExchanges } from "./routes/admin/exchanges"
import { adminOrderEdits } from "./routes/admin/order-edits"
import { adminDraftOrders } from "./routes/admin/draft-orders"
import { storeProducts } from "./routes/store/products"
import { storeOrders } from "./routes/store/orders"
import { storeCarts } from "./routes/store/carts"
import { storeCustomers } from "./routes/store/customers"
import { storeRegions, storeSalesChannels } from "./routes/store/regions"
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
  .route("/admin/regions", adminRegions)
  .route("/admin/sales-channels", adminSalesChannels)
  .route("/admin/products", adminProductVariants)
  .route("/admin/products", adminProductOptions)
  .route("/admin/products", adminProductImages)
  .route("/admin/stock-locations", adminStockLocations)
  .route("/admin/inventory-items", adminInventoryItems)
  .route("/admin/uploads", adminUploads)
  .route("/admin/stores", adminStore)
  .route("/admin/payments", adminPayments)
  .route("/admin/returns", adminReturns)
  .route("/admin/claims", adminClaims)
  .route("/admin/exchanges", adminExchanges)
  .route("/admin/order-edits", adminOrderEdits)
  .route("/admin/draft-orders", adminDraftOrders)
  .route("/store/products", storeProducts)
  .route("/store/orders", storeOrders)
  .route("/store/carts", storeCarts)
  .route("/store/customers", storeCustomers)
  .route("/store/regions", storeRegions)
  .route("/store/sales-channels", storeSalesChannels)

const app = new Hono()
  .onError(errorHandler)
  .use("*", logger())
  .use("*", corsMiddleware)
  .route("/api", apiRoutes)

const appMount = mountAppSpa(app)

export type AppType = typeof app
export { app, appMount }
