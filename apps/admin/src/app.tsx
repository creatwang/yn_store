import { QueryClientProvider } from "@tanstack/react-query"
import { Toaster, TooltipProvider } from "@medusajs/ui"
import { Spinner } from "@medusajs/icons"
import i18n from "i18next"
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from "react-router-dom"
import { HelmetProvider } from "react-helmet-async"
import { ErrorBoundary } from "./components/utilities/error-boundary/error-boundary"
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
import { lazyDetailRoute } from "./lib/lazy-route"

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
    <Route errorElement={<ErrorBoundary />}>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route path="login" lazy={() => import("./routes/login")} />
      </Route>

      {/* Protected + Main Layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route index lazy={() => import("./routes/home")} />

          {/* Products */}
          <Route
            path="products"
            handle={{ breadcrumb: () => i18n.t("products.domain") }}
          >
            <Route index lazy={() => import("./routes/products/product-list")} />
            <Route path="create" lazy={() => import("./routes/products/product-create")} />
            <Route path="import" lazy={() => import("./routes/products/product-import")} />
            <Route path="export" lazy={() => import("./routes/products/product-export")} />
            <Route
              path=":id"
              lazy={lazyDetailRoute(
                () => import("./routes/products/product-detail"),
              )}
            >
              <Route
                path="edit-variant"
                lazy={() =>
                  import("./routes/product-variants/product-variant-edit")
                }
              />
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
              <Route path="variants/:variant_id" lazy={() => import("./routes/product-variants/product-variant-detail")}>
                <Route path="edit" lazy={() => import("./routes/product-variants/product-variant-edit")} />
                <Route path="metadata/edit" lazy={() => import("./routes/product-variants/product-variant-metadata")} />
                <Route path="manage-items" lazy={() => import("./routes/product-variants/product-variant-manage-inventory-items")} />
                <Route path="media" lazy={() => import("./routes/product-variants/product-variant-media")} />
              </Route>
              <Route path="images/:image_id/variants" lazy={() => import("./routes/products/product-image-variants-edit")} />
            </Route>
          </Route>

          {/* Orders */}
          <Route path="orders">
            <Route index lazy={() => import("./routes/orders/order-list")} />
            <Route
              path="export"
              lazy={() => import("./routes/orders/order-export")}
            />
            <Route
              path=":id"
              lazy={() => import("./routes/orders/order-detail")}
            >
              <Route
                path="edits"
                lazy={() => import("./routes/orders/order-create-edit")}
              />
              <Route
                path="returns"
                lazy={() => import("./routes/orders/order-create-return")}
              />
              <Route
                path="returns/:return_id/receive"
                lazy={() => import("./routes/orders/order-receive-return")}
              />
              <Route
                path="exchanges"
                lazy={() => import("./routes/orders/order-create-exchange")}
              />
              <Route
                path="claims"
                lazy={() => import("./routes/orders/order-create-claim")}
              />
              <Route
                path="allocate-items"
                lazy={() => import("./routes/orders/order-allocate-items")}
              />
              <Route
                path="refund"
                lazy={() => import("./routes/orders/order-create-refund")}
              />
              <Route
                path="fulfillment"
                lazy={() => import("./routes/orders/order-create-fulfillment")}
              />
              <Route
                path=":f_id/create-shipment"
                lazy={() => import("./routes/orders/order-create-shipment")}
              />
              <Route
                path="transfer"
                lazy={() => import("./routes/orders/order-request-transfer")}
              />
              <Route
                path="shipping-address"
                lazy={() =>
                  import("./routes/orders/order-edit-shipping-address")
                }
              />
              <Route
                path="billing-address"
                lazy={() =>
                  import("./routes/orders/order-edit-billing-address")
                }
              />
              <Route
                path="email"
                lazy={() => import("./routes/orders/order-edit-email")}
              />
              <Route
                path="metadata/edit"
                lazy={() => import("./routes/orders/order-metadata")}
              />
            </Route>
          </Route>

          {/* Draft Orders */}
          <Route
            path="draft-orders"
            handle={{
              breadcrumb: () => i18n.t("draftOrders.domain"),
            }}
          >
            <Route
              index
              lazy={() => import("./routes/draft-orders/draft-order-list")}
            />
            <Route
              path="create"
              lazy={() => import("./routes/draft-orders/draft-order-create")}
            />
            <Route
              path=":id"
              lazy={() => import("./routes/draft-orders/draft-order-detail")}
            >
              <Route
                path="items"
                lazy={() =>
                  import(
                    "./routes/draft-orders/draft-order-detail/draft-order-items"
                  )
                }
              />
              <Route
                path="custom-items"
                lazy={() =>
                  import(
                    "./routes/draft-orders/draft-order-detail/draft-order-custom-items"
                  )
                }
              />
              <Route
                path="promotions"
                lazy={() =>
                  import(
                    "./routes/draft-orders/draft-order-detail/draft-order-promotions"
                  )
                }
              />
              <Route
                path="shipping"
                lazy={() =>
                  import(
                    "./routes/draft-orders/draft-order-detail/draft-order-shipping"
                  )
                }
              />
              <Route
                path="shipping-address"
                lazy={() =>
                  import(
                    "./routes/draft-orders/draft-order-detail/draft-order-shipping-address"
                  )
                }
              />
              <Route
                path="billing-address"
                lazy={() =>
                  import(
                    "./routes/draft-orders/draft-order-detail/draft-order-billing-address"
                  )
                }
              />
              <Route
                path="email"
                lazy={() =>
                  import(
                    "./routes/draft-orders/draft-order-detail/draft-order-email"
                  )
                }
              />
              <Route
                path="sales-channel"
                lazy={() =>
                  import(
                    "./routes/draft-orders/draft-order-detail/draft-order-sales-channel"
                  )
                }
              />
              <Route
                path="metadata"
                lazy={() =>
                  import(
                    "./routes/draft-orders/draft-order-detail/draft-order-metadata"
                  )
                }
              />
              <Route
                path="transfer-ownership"
                lazy={() =>
                  import(
                    "./routes/draft-orders/draft-order-detail/draft-order-transfer-ownership"
                  )
                }
              />
            </Route>
          </Route>

          {/* Customers */}
          <Route
            path="customers"
            handle={{ breadcrumb: () => i18n.t("customers.domain") }}
          >
            <Route index lazy={() => import("./routes/customers/customer-list")} />
            <Route path="create" lazy={() => import("./routes/customers/customer-create")} />
            <Route
              path=":id"
              lazy={lazyDetailRoute(
                () => import("./routes/customers/customer-detail"),
              )}
            >
              <Route
                path="edit"
                lazy={() => import("./routes/customers/customer-edit")}
              />
              <Route
                path="create-address"
                lazy={() =>
                  import("./routes/customers/customer-create-address")
                }
              />
              <Route
                path="add-customer-groups"
                lazy={() =>
                  import("./routes/customers/customers-add-customer-group")
                }
              />
              <Route
                path="metadata/edit"
                lazy={() => import("./routes/customers/customer-metadata")}
              />
            </Route>
          </Route>

          {/* Collections */}
          <Route
            path="collections"
            handle={{ breadcrumb: () => i18n.t("collections.domain") }}
          >
            <Route
              index
              lazy={() => import("./routes/collections/collection-list")}
            />
            <Route
              path="create"
              lazy={() => import("./routes/collections/collection-create")}
            />
            <Route
              path=":id"
              lazy={lazyDetailRoute(
                () => import("./routes/collections/collection-detail"),
              )}
            >
              <Route
                path="edit"
                lazy={() => import("./routes/collections/collection-edit")}
              />
              <Route
                path="products"
                lazy={() =>
                  import("./routes/collections/collection-add-products")
                }
              />
              <Route
                path="metadata/edit"
                lazy={() => import("./routes/collections/collection-metadata")}
              />
            </Route>
          </Route>

          {/* Categories */}
          <Route path="categories">
            <Route index lazy={() => import("./routes/categories/category-list")} />
            <Route path="create" lazy={() => import("./routes/categories/category-create")} />
            <Route path=":id" lazy={() => import("./routes/categories/category-detail")} />
          </Route>

          {/* Promotions */}
          <Route
            path="promotions"
            handle={{ breadcrumb: () => i18n.t("promotions.domain") }}
          >
            <Route
              index
              lazy={() => import("./routes/promotions/promotion-list")}
            />
            <Route
              path="create"
              lazy={() => import("./routes/promotions/promotion-create")}
            />
            <Route
              path=":id"
              lazy={lazyDetailRoute(
                () => import("./routes/promotions/promotion-detail"),
              )}
            >
              <Route
                path="edit"
                lazy={() =>
                  import("./routes/promotions/promotion-edit-details")
                }
              />
              <Route
                path="add-to-campaign"
                lazy={() =>
                  import("./routes/promotions/promotion-add-campaign")
                }
              />
              <Route
                path=":ruleType/edit"
                lazy={() => import("./routes/promotions/common/edit-rules")}
              />
            </Route>
          </Route>

          {/* Campaigns */}
          <Route
            path="campaigns"
            handle={{ breadcrumb: () => i18n.t("campaigns.domain") }}
          >
            <Route
              index
              lazy={() => import("./routes/campaigns/campaign-list")}
            />
            <Route
              path="create"
              lazy={() => import("./routes/campaigns/campaign-create")}
            />
            <Route
              path=":id"
              lazy={lazyDetailRoute(
                () => import("./routes/campaigns/campaign-detail"),
              )}
            >
              <Route
                path="edit"
                lazy={() => import("./routes/campaigns/campaign-edit")}
              />
              <Route
                path="edit-budget"
                lazy={() =>
                  import("./routes/campaigns/campaign-budget-edit")
                }
              />
              <Route
                path="configuration"
                lazy={() =>
                  import("./routes/campaigns/campaign-configuration")
                }
              />
              <Route
                path="add-promotions"
                lazy={() =>
                  import("./routes/campaigns/add-campaign-promotions")
                }
              />
            </Route>
          </Route>

          {/* Price Lists */}
          <Route
            path="price-lists"
            handle={{ breadcrumb: () => i18n.t("priceLists.domain") }}
          >
            <Route
              index
              lazy={() => import("./routes/price-lists/price-list-list")}
            />
            <Route
              path="create"
              lazy={() => import("./routes/price-lists/price-list-create")}
            />
            <Route
              path=":id"
              lazy={lazyDetailRoute(
                () => import("./routes/price-lists/price-list-detail"),
              )}
            >
              <Route
                path="edit"
                lazy={() => import("./routes/price-lists/price-list-edit")}
              />
              <Route
                path="configuration"
                lazy={() =>
                  import("./routes/price-lists/price-list-configuration")
                }
              />
              <Route
                path="metadata/edit"
                lazy={() => import("./routes/price-lists/price-list-metadata")}
              />
              <Route
                path="products/add"
                lazy={() =>
                  import("./routes/price-lists/price-list-prices-add")
                }
              />
              <Route
                path="products/edit"
                lazy={() =>
                  import("./routes/price-lists/price-list-prices-edit")
                }
              />
            </Route>
          </Route>

          <Route
            path="customer-groups"
            handle={{
              breadcrumb: () => i18n.t("customerGroups.domain"),
            }}
          >
            <Route
              index
              lazy={() =>
                import("./routes/customer-groups/customer-group-list")
              }
            />
            <Route
              path="create"
              lazy={() =>
                import("./routes/customer-groups/customer-group-create")
              }
            />
            <Route
              path=":id"
              lazy={lazyDetailRoute(
                () =>
                  import("./routes/customer-groups/customer-group-detail"),
              )}
            >
              <Route
                path="edit"
                lazy={() =>
                  import("./routes/customer-groups/customer-group-edit")
                }
              />
              <Route
                path="add-customers"
                lazy={() =>
                  import(
                    "./routes/customer-groups/customer-group-add-customers"
                  )
                }
              />
              <Route
                path="metadata/edit"
                lazy={() =>
                  import("./routes/customer-groups/customer-group-metadata")
                }
              />
            </Route>
          </Route>

          {/* Inventory */}
          <Route
            path="inventory"
            handle={{ breadcrumb: () => i18n.t("inventory.domain") }}
          >
            <Route
              index
              lazy={() => import("./routes/inventory/inventory-list")}
            />
            <Route
              path="create"
              lazy={() => import("./routes/inventory/inventory-create")}
            />
            <Route
              path="stock"
              lazy={() => import("./routes/inventory/inventory-stock")}
            />
            <Route
              path=":id"
              lazy={lazyDetailRoute(
                () => import("./routes/inventory/inventory-detail"),
              )}
            >
              <Route
                path="edit"
                lazy={() =>
                  import(
                    "./routes/inventory/inventory-detail/components/edit-inventory-item"
                  )
                }
              />
              <Route
                path="attributes"
                lazy={() =>
                  import(
                    "./routes/inventory/inventory-detail/components/edit-inventory-item-attributes"
                  )
                }
              />
              <Route
                path="locations"
                lazy={() =>
                  import(
                    "./routes/inventory/inventory-detail/components/manage-locations"
                  )
                }
              />
              <Route
                path="locations/:location_id"
                lazy={() =>
                  import(
                    "./routes/inventory/inventory-detail/components/adjust-inventory"
                  )
                }
              />
              <Route
                path="metadata/edit"
                lazy={() => import("./routes/inventory/inventory-metadata")}
              />
            </Route>
          </Route>

          {/* Reservations */}
          <Route
            path="reservations"
            handle={{ breadcrumb: () => i18n.t("reservations.domain") }}
          >
            <Route
              index
              lazy={() => import("./routes/reservations/reservation-list")}
            />
            <Route
              path="create"
              lazy={() => import("./routes/reservations/reservation-create")}
            />
            <Route
              path=":id"
              lazy={lazyDetailRoute(
                () => import("./routes/reservations/reservation-detail"),
              )}
            >
              <Route
                path="edit"
                lazy={() =>
                  import(
                    "./routes/reservations/reservation-detail/components/edit-reservation"
                  )
                }
              />
              <Route
                path="metadata/edit"
                lazy={() =>
                  import("./routes/reservations/reservation-metadata")
                }
              />
            </Route>
          </Route>
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
            <Route
              path=":id"
              lazy={lazyDetailRoute(
                () => import("./routes/sales-channels/sales-channel-detail"),
              )}
            >
              <Route
                path="edit"
                lazy={() => import("./routes/sales-channels/sales-channel-edit")}
              />
              <Route
                path="products"
                lazy={() =>
                  import("./routes/sales-channels/sales-channel-add-products")
                }
              />
              <Route
                path="metadata/edit"
                lazy={() => import("./routes/sales-channels/sales-channel-metadata")}
              />
            </Route>
          </Route>

          <Route path="store" lazy={() => import("./routes/store/store-detail")} />
          <Route path="users" lazy={() => import("./routes/users/user-list")} />
          <Route path="tax-regions" lazy={() => import("./routes/tax-regions/tax-region-list")} />
          <Route path="product-tags" lazy={() => import("./routes/product-tags/product-tag-list")} />
          <Route path="product-types" lazy={() => import("./routes/product-types/product-type-list")} />
          <Route path="locations" lazy={() => import("./routes/locations/location-list")} />
          <Route path="return-reasons" lazy={() => import("./routes/return-reasons/return-reason-list")} />
          <Route path="refund-reasons" lazy={() => import("./routes/refund-reasons/refund-reason-list")} />

          <Route path="publishable-api-keys">
            <Route
              index
              lazy={() =>
                import("./routes/api-key-management/api-key-management-list")
              }
            />
            <Route
              path="create"
              lazy={() =>
                import("./routes/api-key-management/api-key-management-create")
              }
            />
            <Route
              path=":id"
              lazy={lazyDetailRoute(
                () =>
                  import("./routes/api-key-management/api-key-management-detail"),
              )}
            >
              <Route
                path="edit"
                lazy={() =>
                  import("./routes/api-key-management/api-key-management-edit")
                }
              />
              <Route
                path="sales-channels"
                lazy={() =>
                  import(
                    "./routes/api-key-management/api-key-management-sales-channels"
                  )
                }
              />
            </Route>
          </Route>

          <Route path="secret-api-keys">
            <Route
              index
              lazy={() =>
                import("./routes/api-key-management/api-key-management-list")
              }
            />
            <Route
              path="create"
              lazy={() =>
                import("./routes/api-key-management/api-key-management-create")
              }
            />
            <Route
              path=":id"
              lazy={lazyDetailRoute(
                () =>
                  import("./routes/api-key-management/api-key-management-detail"),
              )}
            >
              <Route
                path="edit"
                lazy={() =>
                  import("./routes/api-key-management/api-key-management-edit")
                }
              />
              <Route
                path="sales-channels"
                lazy={() =>
                  import(
                    "./routes/api-key-management/api-key-management-sales-channels"
                  )
                }
              />
            </Route>
          </Route>

          <Route path="workflows">
            <Route
              index
              lazy={() =>
                import(
                  "./routes/workflow-executions/workflow-execution-list"
                )
              }
            />
            <Route
              path=":id"
              lazy={lazyDetailRoute(
                () =>
                  import(
                    "./routes/workflow-executions/workflow-execution-detail"
                  ),
              )}
            />
          </Route>

          <Route path="profile">
            <Route index lazy={() => import("./routes/profile/profile-detail")} />
            <Route path="edit" lazy={() => import("./routes/profile/profile-edit")} />
          </Route>
        </Route>
        <Route path="*" lazy={() => import("./routes/no-match")} />
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
              <I18n>
                <I18nProvider>
                  <RouterProvider
                    router={router}
                    fallbackElement={<Loading />}
                  />
                </I18nProvider>
              </I18n>
            </ExtensionProvider>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  )
}

export default App
