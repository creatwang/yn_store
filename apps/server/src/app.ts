import { Hono } from "hono"
import { logger } from "hono/logger"
import { serveStatic } from "@hono/node-server/serve-static"
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
import { adminStockLocationsFull } from "./routes/admin/batch"
import { adminInventoryItemsFull } from "./routes/admin/batch"
import { adminCategories, adminCollections, adminCustomerGroups, adminPriceLists, adminTaxRates, adminReservations, adminShippingProfiles, adminShippingOptionTypes, adminCurrencies, adminCampaigns, adminApiKeys, adminNotifications, adminWorkflowExecutions, adminPricePreferences, adminPropertyLabels, adminPaymentCollections, adminInventoryLevels, adminPriceListPrices, adminFulfillmentSets, adminCategoryLinkProducts, adminSalesChannelLinkProducts, adminCollectionLinkProducts, adminPriceListLinkProducts, adminPriceListBatchPrices, adminInventoryBatchLevels, adminFulfillmentProviders } from "./routes/admin/batch"
import { adminShippingOptions } from "./routes/admin/shipping-options"
import { adminPromotions } from "./routes/admin/promotions"
import { adminFulfillments } from "./routes/admin/fulfillments"
import { adminUploads } from "./routes/admin/uploads"
import { adminStore } from "./routes/admin/store"
import { adminPayments } from "./routes/admin/payments"
import { adminReturns } from "./routes/admin/returns"
import { adminClaims } from "./routes/admin/claims"
import { adminExchanges } from "./routes/admin/exchanges"
import { adminOrderEdits } from "./routes/admin/order-edits"
import { adminDraftOrders } from "./routes/admin/draft-orders"
import { adminUsers, adminInvites } from "./routes/admin/users"
import { adminProductTags, adminProductTypes, adminTaxRegions, adminReturnReasons, adminRefundReasons } from "./routes/admin/settings"
import { adminViews, adminLocales, adminTaxProviders } from "./routes/admin/views-locales-tax"
import { storeProducts } from "./routes/store/products"
import { storeOrders } from "./routes/store/orders"
import { storeCarts } from "./routes/store/carts"
import { storeCustomers } from "./routes/store/customers"
import { storeRegions, storeSalesChannels } from "./routes/store/regions"
import { storeShippingOptions } from "./routes/store/shipping-options"
import { storePaymentCollections, storePaymentProviders } from "./routes/store/payment-collections"
import { storeCollections, storePromotions } from "./routes/store/catalog"
import { rebuildWebhook } from "./routes/webhooks/rebuild"
import { mountAppSpa } from "./host/mount-app"
import { registerSubscribers } from "./lib/event-subscribers"
import { registerDefaultProviders } from "./lib/providers"
registerSubscribers()
registerDefaultProviders()

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
  .route("/admin/stock-locations", adminStockLocationsFull)
  .route("/admin/inventory-items", adminInventoryItemsFull)
  .route("/admin/product-categories", adminCategories)
  .route("/admin/collections", adminCollections)
  .route("/admin/customer-groups", adminCustomerGroups)
  .route("/admin/price-lists", adminPriceLists)
  .route("/admin/tax-rates", adminTaxRates)
  .route("/admin/reservations", adminReservations)
  .route("/admin/shipping-profiles", adminShippingProfiles)
  .route("/admin/shipping-option-types", adminShippingOptionTypes)
  .route("/admin/currencies", adminCurrencies)
  .route("/admin/promotions", adminPromotions)
  .route("/admin/campaigns", adminCampaigns)
  .route("/admin/api-keys", adminApiKeys)
  .route("/admin/notifications", adminNotifications)
  .route("/admin/workflows-executions", adminWorkflowExecutions)
  .route("/admin/shipping-options", adminShippingOptions)
  .route("/admin/price-preferences", adminPricePreferences)
  .route("/admin/property-labels", adminPropertyLabels)
  .route("/admin/inventory-items/:iid/location-levels", adminInventoryLevels)
  .route("/admin/price-lists/:plid/prices", adminPriceListPrices)
  .route("/admin/fulfillment-sets", adminFulfillmentSets)
  .route("/admin/product-categories/:id/products", adminCategoryLinkProducts)
  .route("/admin/sales-channels/:id/products", adminSalesChannelLinkProducts)
  .route("/admin/collections/:id/products", adminCollectionLinkProducts)
  .route("/admin/price-lists/:id/products", adminPriceListLinkProducts)
  .route("/admin/price-lists/:id/prices/batch", adminPriceListBatchPrices)
  .route("/admin/inventory-items/location-levels/batch", adminInventoryBatchLevels)
  .route("/admin/fulfillment-providers", adminFulfillmentProviders)
  .route("/admin/fulfillments", adminFulfillments)
  .route("/admin/payment-collections", adminPaymentCollections)
  .route("/admin/uploads", adminUploads)
  .route("/admin/stores", adminStore)
  .route("/admin/payments", adminPayments)
  .route("/admin/returns", adminReturns)
  .route("/admin/claims", adminClaims)
  .route("/admin/exchanges", adminExchanges)
  .route("/admin/order-edits", adminOrderEdits)
  .route("/admin/draft-orders", adminDraftOrders)
  .route("/admin/users", adminUsers)
  .route("/admin/invites", adminInvites)
  .route("/admin/product-tags", adminProductTags)
  .route("/admin/product-types", adminProductTypes)
  .route("/admin/tax-regions", adminTaxRegions)
  .route("/admin/return-reasons", adminReturnReasons)
  .route("/admin/refund-reasons", adminRefundReasons)
  .route("/admin/views", adminViews)
  .route("/admin/locales", adminLocales)
  .route("/admin/tax-providers", adminTaxProviders)
  .route("/store/products", storeProducts)
  .route("/store/orders", storeOrders)
  .route("/store/carts", storeCarts)
  .route("/store/customers", storeCustomers)
  .route("/store/regions", storeRegions)
  .route("/store/sales-channels", storeSalesChannels)
  .route("/store/shipping-options", storeShippingOptions)
  .route("/store/payment-collections", storePaymentCollections)
  .route("/store/payment-providers", storePaymentProviders)
  .route("/store/collections", storeCollections)
  .route("/store/promotions", storePromotions)
  .route("/webhooks", rebuildWebhook)

const app = new Hono()
  .onError(errorHandler)
  .use("*", logger())
  .use("*", corsMiddleware)
  .route("/api", apiRoutes)

// 为上传的文件提供静态文件服务
app.get("/uploads/*", serveStatic({ root: "public" }))
app.get("/exports/*", serveStatic({ root: "public" }))

const appMount = mountAppSpa(app)

export type AppType = typeof app
export { app, appMount }
