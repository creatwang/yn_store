import { Outlet, Route } from "react-router-dom"
import { lazyDetailRoute } from "../lib/routing/lazy-route"
import { taxRegionLoader } from "../routes/tax-regions/tax-region-detail/loader"

/**
 * Settings 子路由（对齐 @medusajs/dashboard get-route.map settings 段）
 *
 * 必须为 Fragment 子节点，不可包在自定义组件内（RR createRoutesFromElements 限制）
 */
export const settingsRoutesFragment = (
  <>
      <Route path="regions" element={<Outlet />}>
        <Route path="" lazy={() => import("../routes/regions/region-list")}>
          <Route
            path="create"
            lazy={() => import("../routes/regions/region-create")}
          />
        </Route>
        <Route
          path=":id"
          lazy={lazyDetailRoute(
            () => import("../routes/regions/region-detail"),
          )}
        >
          <Route
            path="edit"
            lazy={() => import("../routes/regions/region-edit")}
          />
          <Route
            path="countries/add"
            lazy={() => import("../routes/regions/region-add-countries")}
          />
          <Route
            path="metadata/edit"
            lazy={() => import("../routes/regions/region-metadata")}
          />
        </Route>
      </Route>

      <Route
        path="store"
        lazy={lazyDetailRoute(() => import("../routes/store/store-detail"))}
      >
        <Route path="edit" lazy={() => import("../routes/store/store-edit")} />
        <Route
          path="currencies"
          lazy={() => import("../routes/store/store-add-currencies")}
        />
        <Route
          path="locales"
          lazy={() => import("../routes/store/store-add-locales")}
        />
        <Route
          path="metadata/edit"
          lazy={() => import("../routes/store/store-metadata")}
        />
      </Route>

      <Route path="users" element={<Outlet />}>
        <Route path="" lazy={() => import("../routes/users/user-list")}>
          <Route path="invite" lazy={() => import("../routes/users/user-invite")} />
        </Route>
        <Route
          path=":id"
          lazy={lazyDetailRoute(() => import("../routes/users/user-detail"))}
        >
          <Route path="edit" lazy={() => import("../routes/users/user-edit")} />
          <Route
            path="metadata/edit"
            lazy={() => import("../routes/users/user-metadata")}
          />
        </Route>
      </Route>

      <Route path="tax-regions" element={<Outlet />}>
        <Route path="" lazy={() => import("../routes/tax-regions/tax-region-list")}>
          <Route
            path="create"
            lazy={() => import("../routes/tax-regions/tax-region-create")}
          />
        </Route>
        <Route path=":id" loader={taxRegionLoader} element={<Outlet />}>
          <Route
            path=""
            lazy={async () => {
              const { Component } = await import(
                "../routes/tax-regions/tax-region-detail"
              )
              return { Component }
            }}
          >
            <Route
              path="edit"
              lazy={() => import("../routes/tax-regions/tax-region-edit")}
            />
            <Route
              path="provinces/create"
              lazy={() =>
                import("../routes/tax-regions/tax-region-province-create")
              }
            />
            <Route
              path="overrides/create"
              lazy={() =>
                import("../routes/tax-regions/tax-region-tax-override-create")
              }
            />
            <Route
              path="overrides/:tax_rate_id/edit"
              lazy={() =>
                import("../routes/tax-regions/tax-region-tax-override-edit")
              }
            />
            <Route
              path="tax-rates/create"
              lazy={() =>
                import("../routes/tax-regions/tax-region-tax-rate-create")
              }
            />
            <Route
              path="tax-rates/:tax_rate_id/edit"
              lazy={() =>
                import("../routes/tax-regions/tax-region-tax-rate-edit")
              }
            />
          </Route>
          <Route
            path="provinces/:province_id"
            lazy={lazyDetailRoute(
              () => import("../routes/tax-regions/tax-region-province-detail"),
            )}
          >
            <Route
              path="tax-rates/create"
              lazy={() =>
                import("../routes/tax-regions/tax-region-tax-rate-create")
              }
            />
            <Route
              path="tax-rates/:tax_rate_id/edit"
              lazy={() =>
                import("../routes/tax-regions/tax-region-tax-rate-edit")
              }
            />
            <Route
              path="overrides/create"
              lazy={() =>
                import("../routes/tax-regions/tax-region-tax-override-create")
              }
            />
            <Route
              path="overrides/:tax_rate_id/edit"
              lazy={() =>
                import("../routes/tax-regions/tax-region-tax-override-edit")
              }
            />
          </Route>
        </Route>
      </Route>

      <Route path="locations" element={<Outlet />}>
        <Route index lazy={() => import("../routes/locations/location-list")} />
        <Route
          path="create"
          lazy={() => import("../routes/locations/location-create")}
        />
        <Route path="shipping-profiles" element={<Outlet />}>
          <Route
            path=""
            lazy={() =>
              import("../routes/shipping-profiles/shipping-profiles-list")
            }
          >
            <Route
              path="create"
              lazy={() =>
                import("../routes/shipping-profiles/shipping-profile-create")
              }
            />
          </Route>
          <Route
            path=":shipping_profile_id"
            lazy={lazyDetailRoute(
              () =>
                import("../routes/shipping-profiles/shipping-profile-detail"),
            )}
          >
            <Route
              path="metadata/edit"
              lazy={() =>
                import("../routes/shipping-profiles/shipping-profile-metadata")
              }
            />
          </Route>
        </Route>
        <Route path="shipping-option-types" element={<Outlet />}>
          <Route
            path=""
            lazy={() =>
              import("../routes/shipping-option-types/shipping-option-type-list")
            }
          >
            <Route
              path="create"
              lazy={() =>
                import(
                  "../routes/shipping-option-types/shipping-option-type-create"
                )
              }
            />
          </Route>
          <Route
            path=":id"
            lazy={lazyDetailRoute(
              () =>
                import(
                  "../routes/shipping-option-types/shipping-option-type-detail"
                ),
            )}
          >
            <Route
              path="edit"
              lazy={() =>
                import(
                  "../routes/shipping-option-types/shipping-option-type-edit"
                )
              }
            />
          </Route>
        </Route>
        <Route
          path=":location_id"
          lazy={lazyDetailRoute(
            () => import("../routes/locations/location-detail"),
          )}
        >
          <Route
            path="edit"
            lazy={() => import("../routes/locations/location-edit")}
          />
          <Route
            path="sales-channels"
            lazy={() => import("../routes/locations/location-sales-channels")}
          />
          <Route
            path="fulfillment-providers"
            lazy={() =>
              import("../routes/locations/location-fulfillment-providers")
            }
          />
          <Route
            path="metadata/edit"
            lazy={() => import("../routes/locations/location-metadata")}
          />
          <Route path="fulfillment-set/:fset_id">
            <Route
              path="service-zones/create"
              lazy={() =>
                import("../routes/locations/location-service-zone-create")
              }
            />
            <Route path="service-zone/:zone_id">
              <Route
                path="edit"
                lazy={() =>
                  import("../routes/locations/location-service-zone-edit")
                }
              />
              <Route
                path="areas"
                lazy={() =>
                  import("../routes/locations/location-service-zone-manage-areas")
                }
              />
              <Route path="shipping-option">
                <Route
                  path="create"
                  lazy={() =>
                    import(
                      "../routes/locations/location-service-zone-shipping-option-create"
                    )
                  }
                />
                <Route path=":so_id">
                  <Route
                    path="edit"
                    lazy={() =>
                      import(
                        "../routes/locations/location-service-zone-shipping-option-edit"
                      )
                    }
                  />
                  <Route
                    path="pricing"
                    lazy={() =>
                      import(
                        "../routes/locations/location-service-zone-shipping-option-pricing"
                      )
                    }
                  />
                </Route>
              </Route>
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="product-tags" element={<Outlet />}>
        <Route path="" lazy={() => import("../routes/product-tags/product-tag-list")}>
          <Route
            path="create"
            lazy={() => import("../routes/product-tags/product-tag-create")}
          />
        </Route>
        <Route
          path=":id"
          lazy={lazyDetailRoute(
            () => import("../routes/product-tags/product-tag-detail"),
          )}
        >
          <Route
            path="edit"
            lazy={() => import("../routes/product-tags/product-tag-edit")}
          />
          <Route
            path="metadata/edit"
            lazy={() => import("../routes/product-tags/product-tag-metadata")}
          />
        </Route>
      </Route>

      <Route path="product-types" element={<Outlet />}>
        <Route
          path=""
          lazy={() => import("../routes/product-types/product-type-list")}
        >
          <Route
            path="create"
            lazy={() => import("../routes/product-types/product-type-create")}
          />
        </Route>
        <Route
          path=":id"
          lazy={lazyDetailRoute(
            () => import("../routes/product-types/product-type-detail"),
          )}
        >
          <Route
            path="edit"
            lazy={() => import("../routes/product-types/product-type-edit")}
          />
          <Route
            path="metadata/edit"
            lazy={() => import("../routes/product-types/product-type-metadata")}
          />
        </Route>
      </Route>

      <Route path="return-reasons" element={<Outlet />}>
        <Route
          path=""
          lazy={() => import("../routes/return-reasons/return-reason-list")}
        >
          <Route
            path="create"
            lazy={() => import("../routes/return-reasons/return-reason-create")}
          />
          <Route path=":id">
            <Route
              path="edit"
              lazy={() => import("../routes/return-reasons/return-reason-edit")}
            />
          </Route>
        </Route>
      </Route>

      <Route path="refund-reasons" element={<Outlet />}>
        <Route
          path=""
          lazy={() => import("../routes/refund-reasons/refund-reason-list")}
        >
          <Route
            path="create"
            lazy={() => import("../routes/refund-reasons/refund-reason-create")}
          />
          <Route path=":id">
            <Route
              path="edit"
              lazy={() => import("../routes/refund-reasons/refund-reason-edit")}
            />
          </Route>
        </Route>
      </Route>

      <Route path="translations" element={<Outlet />}>
        <Route
          path=""
          lazy={() => import("../routes/translations/translation-list")}
        />
        <Route
          path="add-locales"
          lazy={() => import("../routes/translations/add-locales")}
        />
        <Route
          path="settings"
          lazy={() => import("../routes/translations/settings")}
        />
        <Route
          path="edit"
          lazy={() => import("../routes/translations/translations-edit")}
        />
      </Route>
  </>
)
