/** Auto-synced from medusajs/medusa v2.15.3 — do not edit manually */
import { z } from "zod"
import { applyAndAndOrOperators } from "../../../helpers/common-validators"
import {
  createFindParams,
  createOperatorMap,
  createSelectParams,
} from "../../../helpers/validators"

export type StoreProductTypeParamsType = z.infer<typeof StoreProductTypeParams>

export const StoreProductTypeParams = createSelectParams().merge(z.object({}))

export const StoreProductTypesParamsFields = z.object({
  q: z.string().optional(),
  id: z.union([z.string(), z.array(z.string())]).optional(),
  value: z.union([z.string(), z.array(z.string())]).optional(),
  external_id: z.union([z.string(), z.array(z.string())]).optional(),
  created_at: createOperatorMap().optional(),
  updated_at: createOperatorMap().optional(),
  deleted_at: createOperatorMap().optional(),
})

export type StoreProductTypesParamsType = z.infer<
  typeof StoreProductTypesParams
>
export const StoreProductTypesParams = createFindParams({
  offset: 0,
  limit: 50,
})
  .merge(StoreProductTypesParamsFields)
  .merge(applyAndAndOrOperators(StoreProductTypesParamsFields))
