/** Auto-synced from medusajs/medusa v2.15.3 — do not edit manually */
import { z } from "zod"
import { createFindParams, createSelectParams } from "../../../helpers/validators"
import { applyAndAndOrOperators } from "../../../helpers/common-validators"

export type StoreGetRegionParamsType = z.infer<typeof StoreGetRegionParams>
export const StoreGetRegionParams = createSelectParams()

export const StoreGetRegionsParamsFields = z.object({
  q: z.string().optional(),
  id: z.union([z.string(), z.array(z.string())]).optional(),
  currency_code: z.union([z.string(), z.array(z.string())]).optional(),
  name: z.union([z.string(), z.array(z.string())]).optional(),
})

export type StoreGetRegionsParamsType = z.infer<typeof StoreGetRegionsParams>
export const StoreGetRegionsParams = createFindParams({
  limit: 50,
  offset: 0,
})
  .merge(StoreGetRegionsParamsFields)
  .merge(applyAndAndOrOperators(StoreGetRegionsParamsFields))
