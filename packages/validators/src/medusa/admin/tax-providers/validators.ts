/** Auto-synced from medusajs/medusa v2.15.3 — do not edit manually */
import { z } from "zod"
import { createFindParams } from "../../../helpers/validators"
import { applyAndAndOrOperators } from "../../../helpers/common-validators"

export const AdminGetTaxProvidersParamsFields = z.object({
  id: z.union([z.string(), z.array(z.string())]).optional(),
  is_enabled: z.boolean().optional(),
})

export type AdminGetTaxProvidersParamsFieldsType = z.infer<
  typeof AdminGetTaxProvidersParamsFields
>

export type AdminGetTaxProvidersParamsType = z.infer<
  typeof AdminGetTaxProvidersParams
>
export const AdminGetTaxProvidersParams = createFindParams({
  limit: 20,
  offset: 0,
})
  .merge(AdminGetTaxProvidersParamsFields)
  .merge(applyAndAndOrOperators(AdminGetTaxProvidersParamsFields))
