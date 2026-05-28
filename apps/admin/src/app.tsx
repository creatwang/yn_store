import { QueryClientProvider } from "@tanstack/react-query"
import { Toaster, TooltipProvider } from "@medusajs/ui"
import { Spinner } from "@medusajs/icons"
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from "react-router-dom"
import { HelmetProvider } from "react-helmet-async"
import { I18n } from "./components/utilities/i18n"
import { queryClient } from "./lib/query-client"
import { ProtectedRoute } from "./components/authentication/protected-route"
import { MainLayout } from "./components/layout/main-layout"
import { SettingsLayout } from "./components/layout/settings-layout"
import { PublicLayout } from "./components/layout/public-layout"
import { ExtensionProvider } from "./providers/extension-provider"
import { I18nProvider } from "./providers/i18n-provider"
import { ThemeProvider } from "./providers/theme-provider"
import "./index.css"

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="animate-spin text-ui-fg-muted" />
    </div>
  )
}

/**
 * 使用 React Router v6 的 `lazy` 属性。
 * Medusa Dashboard 页面导出 `{ Component }` 命名导出，
 * 恰好是 React Router lazy 所期望的。
 */
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route path="/login" lazy={() => import("./routes/login")} />
        <Route path="*" lazy={() => import("./routes/no-match")} />
      </Route>

      {/* Protected + Main Layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route index lazy={() => import("./routes/home")} />

          {/* Products */}
          <Route path="products">
            <Route index lazy={() => import("./routes/products/product-list")} />
            <Route path="create" lazy={() => import("./routes/products/product-create")} />
            <Route path="import" lazy={() => import("./routes/products/product-import")} />
            <Route path="export" lazy={() => import("./routes/products/product-export")} />
            <Route path=":id" lazy={() => import("./routes/products/product-detail")}>
              <Route path="edit" lazy={() => import("./routes/products/product-edit")} />
              <Route path="media" lazy={() => import("./routes/products/product-media")} />
              <Route path="prices" lazy={() => import("./routes/products/product-prices")} />
              <Route path="stock" lazy={() => import("./routes/products/product-stock")} />
              <Route path="sales-channels" lazy={() => import("./routes/products/product-sales-channels")} />
              <Route path="organization" lazy={() => import("./routes/products/product-organization")} />
              <Route path="attributes" lazy={() => import("./routes/products/product-attributes")} />
              <Route path="shipping-profile" lazy={() => import("./routes/products/product-shipping-profile")} />
              <Route path="metadata/edit" lazy={() => import("./routes/products/product-metadata")} />
              <Route path="options/create" lazy={() => import("./routes/products/product-create-option")} />
              <Route path="options/:option_id/edit" lazy={() => import("./routes/products/product-edit-option")} />
              <Route path="variants/create" lazy={() => import("./routes/products/product-create-variant")} />
              <Route path="images/:image_id/variants" lazy={() => import("./routes/products/product-image-variants-edit")} />
            </Route>
          </Route>

          {/* Orders */}
          <Route path="orders">
            <Route index lazy={() => import("./routes/orders/order-list")} />
            <Route path=":id" lazy={() => import("./routes/orders/order-detail")} />
          </Route>

          {/* Customers */}
          <Route path="customers">
            <Route index lazy={() => import("./routes/customers/customer-list")} />
            <Route path="create" lazy={() => import("./routes/customers/customer-create")} />
            <Route path=":id" lazy={() => import("./routes/customers/customer-detail")} />
          </Route>

          {/* Collections */}
          <Route path="collections">
            <Route index lazy={() => import("./routes/collections/collection-list")} />
            <Route path="create" lazy={() => import("./routes/collections/collection-create")} />
            <Route path=":id" lazy={() => import("./routes/collections/collection-detail")} />
          </Route>

          {/* Categories */}
          <Route path="categories">
            <Route index lazy={() => import("./routes/categories/category-list")} />
            <Route path="create" lazy={() => import("./routes/categories/category-create")} />
            <Route path=":id" lazy={() => import("./routes/categories/category-detail")} />
          </Route>

          {/* Promotions */}
          <Route path="promotions" lazy={() => import("./routes/promotions/promotion-list")} />
          <Route path="campaigns" lazy={() => import("./routes/campaigns/campaign-list")} />
          <Route path="price-lists" lazy={() => import("./routes/price-lists/price-list-list")} />
          <Route path="customer-groups" lazy={() => import("./routes/customer-groups/customer-group-list")} />
          <Route path="inventory" lazy={() => import("./routes/inventory/inventory-list")} />
          <Route path="reservations" lazy={() => import("./routes/reservations/reservation-list")} />
        </Route>

        {/* Settings Layout */}
        <Route path="settings" element={<SettingsLayout />}>
          <Route index lazy={() => import("./routes/settings")} />

          <Route path="regions">
            <Route index lazy={() => import("./routes/regions/region-list")} />
            <Route path="create" lazy={() => import("./routes/regions/region-create")} />
            <Route path=":id" lazy={() => import("./routes/regions/region-detail")} />
          </Route>

          <Route path="sales-channels">
            <Route index lazy={() => import("./routes/sales-channels/sales-channel-list")} />
            <Route path="create" lazy={() => import("./routes/sales-channels/sales-channel-create")} />
            <Route path=":id" lazy={() => import("./routes/sales-channels/sales-channel-detail")} />
          </Route>

          <Route path="store" lazy={() => import("./routes/store/store-detail")} />
          <Route path="users" lazy={() => import("./routes/users/user-list")} />
          <Route path="tax-regions" lazy={() => import("./routes/tax-regions/tax-region-list")} />
          <Route path="product-tags" lazy={() => import("./routes/product-tags/product-tag-list")} />
          <Route path="product-types" lazy={() => import("./routes/product-types/product-type-list")} />
          <Route path="locations" lazy={() => import("./routes/locations/location-list")} />
          <Route path="return-reasons" lazy={() => import("./routes/return-reasons/return-reason-list")} />
          <Route path="refund-reasons" lazy={() => import("./routes/refund-reasons/refund-reason-list")} />
        </Route>
      </Route>
    </Route>
  ),
  { basename: "/app" }
)

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <ExtensionProvider>
              <I18n />
              <I18nProvider>
                <RouterProvider router={router} fallbackElement={<Loading />} />
              </I18nProvider>
            </ExtensionProvider>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  )
}

export default App
