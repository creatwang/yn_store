// @ts-nocheck
import {
  AdminProduct,
  AdminProductCategory,
  AdminShippingProfile,
} from "@medusajs/types"
import { getLinkedFields } from "../../../dashboard-app"

export const PRODUCT_DETAIL_FIELDS = getLinkedFields(
  "product",
  "*categories,*shipping_profile,*images,*options,*options.values,*type,*collection,*tags,*sales_channels,-variants"
)

export type ExtendedProduct = AdminProduct & {
  categories?: AdminProductCategory[]
  shipping_profile?: AdminShippingProfile
}
