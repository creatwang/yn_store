/**
 * 官方 Medusa v2.15.3 列表 query validators（路由层统一从此导入）
 * 勿在业务层再维护 listXxxSchema 简化版。
 */
import type { z } from "zod"
import { createFindParams } from "./helpers/validators"
export {
  AdminGetOrdersParams,
  type AdminGetOrdersParamsType,
  AdminOrderChangesParams,
  type AdminOrderChangesType,
} from "./medusa/admin/orders/validators"

export {
  AdminGetDraftOrdersParams,
  type AdminGetDraftOrdersParamsType,
} from "./medusa/admin/draft-orders/validators"

export {
  AdminGetProductsParams,
  type AdminGetProductsParamsType,
} from "./medusa/admin/products/validators"

export {
  AdminCustomersParams,
  type AdminCustomersParamsType,
} from "./medusa/admin/customers/validators"

export {
  AdminGetOrdersParams as AdminListReturnsParams,
  type AdminGetOrdersParamsType as AdminListReturnsParamsType,
} from "./medusa/admin/returns/validators"

export {
  AdminGetOrdersParams as AdminListClaimsParams,
  type AdminGetOrdersParamsType as AdminListClaimsParamsType,
} from "./medusa/admin/claims/validators"

export {
  AdminGetOrdersParams as AdminListExchangesParams,
  type AdminGetOrdersParamsType as AdminListExchangesParamsType,
} from "./medusa/admin/exchanges/validators"

export {
  AdminGetCollectionsParams,
  type AdminGetCollectionsParamsType,
} from "./medusa/admin/collections/validators"

export {
  AdminProductCategoriesParams,
  type AdminProductCategoriesParamsType,
} from "./medusa/admin/product-categories/validators"

export {
  AdminGetCustomerGroupsParams,
  type AdminGetCustomerGroupsParamsType,
} from "./medusa/admin/customer-groups/validators"

export { AdminGetPriceListsParams } from "./medusa/admin/price-lists/validators"
export type AdminGetPriceListsParamsType = z.infer<
  typeof import("./medusa/admin/price-lists/validators").AdminGetPriceListsParams
>

export {
  AdminGetTaxRatesParams,
  type AdminGetTaxRatesParamsType,
} from "./medusa/admin/tax-rates/validators"

export {
  AdminBulkCreateReservations,
  AdminGetReservationsParams,
  type AdminBulkCreateReservationsType,
  type AdminGetReservationsParamsType,
} from "./medusa/admin/reservations/validators"

export {
  AdminGetShippingProfilesParams,
  type AdminGetShippingProfilesParamsType,
} from "./medusa/admin/shipping-profiles/validators"

export {
  AdminGetShippingOptionTypesParams,
  type AdminGetShippingOptionTypesParamsType,
} from "./medusa/admin/shipping-option-types/validators"

export {
  AdminGetPromotionsParams,
  type AdminGetPromotionsParamsType,
} from "./medusa/admin/promotions/validators"

export {
  AdminGetCampaignsParams,
  type AdminGetCampaignsParamsType,
} from "./medusa/admin/campaigns/validators"

export {
  AdminGetApiKeysParams,
  type AdminGetApiKeysParamsType,
} from "./medusa/admin/api-keys/validators"

export {
  AdminGetShippingOptionsParams,
  type AdminGetShippingOptionsParamsType,
} from "./medusa/admin/shipping-options/validators"

export { AdminGetPricePreferencesParams } from "./medusa/admin/price-preferences/validators"
export type AdminGetPricePreferencesParamsType = z.infer<
  typeof import("./medusa/admin/price-preferences/validators").AdminGetPricePreferencesParams
>

export {
  AdminGetRegionsParams,
  type AdminGetRegionsParamsType,
} from "./medusa/admin/regions/validators"

export {
  AdminGetSalesChannelsParams,
  type AdminGetSalesChannelsParamsType,
} from "./medusa/admin/sales-channels/validators"

export {
  AdminGetPaymentsParams,
  type AdminGetPaymentsParamsType,
  AdminGetPaymentProvidersParams,
  type AdminGetPaymentProvidersParamsType,
} from "./medusa/admin/payments/validators"

export {
  AdminGetStockLocationsParams,
  type AdminGetStockLocationsParamsType,
} from "./medusa/admin/stock-locations/validators"

export {
  AdminGetInventoryItemsParams,
  type AdminGetInventoryItemsParamsType,
} from "./medusa/admin/inventory-items/validators"

export {
  AdminGetProductTagsParams,
  type AdminGetProductTagsParamsType,
} from "./medusa/admin/product-tags/validators"

export {
  AdminGetProductTypesParams,
  type AdminGetProductTypesParamsType,
} from "./medusa/admin/product-types/validators"

export {
  AdminGetTaxRegionsParams,
  type AdminGetTaxRegionsParamsType,
} from "./medusa/admin/tax-regions/validators"

export {
  AdminGetReturnReasonsParams,
  type AdminGetReturnReasonsParamsType,
} from "./medusa/admin/return-reasons/validators"

export {
  AdminGetRefundReasonsParams,
  type AdminGetRefundReasonsParamsType,
} from "./medusa/admin/refund-reasons/validators"

export {
  AdminGetUsersParams,
  type AdminGetUsersParamsType,
} from "./medusa/admin/users/validators"

export {
  AdminGetInvitesParams,
  type AdminGetInvitesParamsType,
} from "./medusa/admin/invites/validators"

export {
  StoreGetOrdersParams,
  type StoreGetOrdersParamsType,
} from "./medusa/store/orders/validators"

export {
  StoreGetProductsParams,
  type StoreGetProductsParamsType,
} from "./medusa/store/products/validators"

export {
  StoreGetRegionsParams,
  type StoreGetRegionsParamsType,
} from "./medusa/store/regions/validators"

export {
  StoreGetCollectionsParams,
  type StoreGetCollectionsParamsType,
} from "./medusa/store/collections/validators"

export {
  AdminPropertyLabelListParams,
  type AdminPropertyLabelListParamsType,
} from "./medusa/admin/property-labels/validators"

export {
  AdminGetNotificationsParams,
} from "./medusa/admin/notifications/validators"
export type AdminGetNotificationsParamsType = z.infer<
  typeof import("./medusa/admin/notifications/validators").AdminGetNotificationsParams
>

export {
  AdminGetWorkflowExecutionsParams,
} from "./medusa/admin/workflows-executions/validators"
export type AdminGetWorkflowExecutionsParamsType = z.infer<
  typeof import("./medusa/admin/workflows-executions/validators").AdminGetWorkflowExecutionsParams
>

export {
  AdminGetProductVariantsParams,
} from "./medusa/admin/product-variants/validators"
export type AdminGetProductVariantsParamsType = z.infer<
  typeof import("./medusa/admin/product-variants/validators").AdminGetProductVariantsParams
>

export {
  AdminFulfillmentProvidersParams,
} from "./medusa/admin/fulfillment-providers/validators"
export type AdminFulfillmentProvidersParamsType = z.infer<
  typeof import("./medusa/admin/fulfillment-providers/validators").AdminFulfillmentProvidersParams
>

export {
  StoreGetShippingOptions,
} from "./medusa/store/shipping-options/validators"
export type StoreGetShippingOptionsType = z.infer<
  typeof import("./medusa/store/shipping-options/validators").StoreGetShippingOptions
>

export {
  StoreGetPaymentProvidersParams,
} from "./medusa/store/payment-providers/validators"
export type StoreGetPaymentProvidersParamsType = z.infer<
  typeof import("./medusa/store/payment-providers/validators").StoreGetPaymentProvidersParams
>

export {
  AdminGetLocalesParams,
} from "./medusa/admin/locales/validators"
export type AdminGetLocalesParamsType = z.infer<
  typeof import("./medusa/admin/locales/validators").AdminGetLocalesParams
>

export {
  AdminGetTaxProvidersParams,
} from "./medusa/admin/tax-providers/validators"
export type AdminGetTaxProvidersParamsType = z.infer<
  typeof import("./medusa/admin/tax-providers/validators").AdminGetTaxProvidersParams
>

/** 官方模块无独立 list schema 时，使用 Medusa createFindParams */
export const AdminListFulfillmentsParams = createFindParams({
  limit: 50,
  offset: 0,
})
export type AdminListFulfillmentsParamsType = z.infer<
  typeof AdminListFulfillmentsParams
>

export const AdminListPaymentCollectionsParams = createFindParams({
  limit: 50,
  offset: 0,
})
export type AdminListPaymentCollectionsParamsType = z.infer<
  typeof AdminListPaymentCollectionsParams
>

export const AdminListFulfillmentSetsParams = createFindParams({
  limit: 50,
  offset: 0,
})
export type AdminListFulfillmentSetsParamsType = z.infer<
  typeof AdminListFulfillmentSetsParams
>
