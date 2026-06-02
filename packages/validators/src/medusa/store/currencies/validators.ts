/** Auto-synced from medusajs/medusa v2.15.3 — do not edit manually */
import { z } from "zod"
import { createFindParams, createSelectParams } from "../../../helpers/validators"
import { applyAndAndOrOperators } from "../../../helpers/common-validators"

export const StoreGetCurrencyParams = createSelectParams()

export const StoreGetCurrenciesParamsFields = z.object({
  q: z.string().optional(),
  code: z.union([z.string(), z.array(z.string())]).optional(),
})

export type StoreGetCurrenciesParamsType = z.infer<
  typeof StoreGetCurrenciesParams
>
export const StoreGetCurrenciesParams = createFindParams({
  offset: 0,
  limit: 50,
})
  .merge(StoreGetCurrenciesParamsFields)
  .merge(applyAndAndOrOperators(StoreGetCurrenciesParamsFields))
