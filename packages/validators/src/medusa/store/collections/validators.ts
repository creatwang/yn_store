/** Auto-synced from medusajs/medusa v2.15.3 — do not edit manually */
import { z } from "zod"
import {
  createFindParams,
  createOperatorMap,
  createSelectParams,
} from "../../../helpers/validators"
import { applyAndAndOrOperators } from "../../../helpers/common-validators"

export const StoreGetCollectionParams = createSelectParams()

export const StoreGetCollectionsParamsFields = z.object({
  q: z.string().optional(),
  id: z.union([z.string(), z.array(z.string())]).optional(),
  title: z.union([z.string(), z.array(z.string())]).optional(),
  handle: z.union([z.string(), z.array(z.string())]).optional(),
  external_id: z.union([z.string(), z.array(z.string())]).optional(),
  created_at: createOperatorMap().optional(),
  updated_at: createOperatorMap().optional(),
})

export type StoreGetCollectionsParamsType = z.infer<
  typeof StoreGetCollectionsParams
>
export const StoreGetCollectionsParams = createFindParams({
  offset: 0,
  limit: 10,
  order: "-created_at",
})
  .merge(StoreGetCollectionsParamsFields)
  .merge(applyAndAndOrOperators(StoreGetCollectionsParamsFields))
