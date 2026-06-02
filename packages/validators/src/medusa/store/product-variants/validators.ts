/** Auto-synced from medusajs/medusa v2.15.3 — do not edit manually */
import { z } from "zod"
import {
  applyAndAndOrOperators,
  booleanString,
} from "../../../helpers/common-validators"
import {
  createFindParams,
  createOperatorMap,
  createSelectParams,
} from "../../../helpers/validators"

const StoreProductVariantContextFields = z.object({
  region_id: z.string().optional(),
  country_code: z.string().optional(),
  province: z.string().optional(),
  cart_id: z.string().optional(),
  sales_channel_id: z.union([z.string(), z.array(z.string())]).optional(),
})

const StoreProductVariantFilterFields = z.object({
  q: z.string().optional(),
  id: z.union([z.string(), z.array(z.string())]).optional(),
  sku: z.union([z.string(), z.array(z.string())]).optional(),
  product_id: z.union([z.string(), z.array(z.string())]).optional(),
  options: z
    .object({
      value: z.string().optional(),
      option_id: z.string().optional(),
    })
    .optional(),
  allow_backorder: booleanString().optional(),
  manage_inventory: booleanString().optional(),
  created_at: createOperatorMap().optional(),
  updated_at: createOperatorMap().optional(),
  deleted_at: createOperatorMap().optional(),
})

export const StoreProductVariantParams = createSelectParams().merge(
  StoreProductVariantContextFields
)

export type StoreProductVariantParamsType = z.infer<
  typeof StoreProductVariantParams
>

export const StoreProductVariantListParams = createFindParams({
  offset: 0,
  limit: 20,
})
  .merge(StoreProductVariantContextFields)
  .merge(StoreProductVariantFilterFields)
  .merge(applyAndAndOrOperators(StoreProductVariantFilterFields))

export type StoreProductVariantListParamsType = z.infer<
  typeof StoreProductVariantListParams
>
