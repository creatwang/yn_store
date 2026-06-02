/** Auto-synced from medusajs/medusa v2.15.3 — do not edit manually */
import { z } from "zod"
import { createFindParams, createSelectParams } from "../../../helpers/validators"
import { applyAndAndOrOperators } from "../../../helpers/common-validators"

export const AdminGetLocaleParams = createSelectParams()

export const AdminGetLocalesParamsFields = z.object({
  q: z.string().optional(),
  code: z.union([z.string(), z.array(z.string())]).optional(),
})

export type AdminGetLocalesParamsType = z.infer<typeof AdminGetLocalesParams>
export const AdminGetLocalesParams = createFindParams({
  offset: 0,
  limit: 200,
})
  .merge(AdminGetLocalesParamsFields)
  .merge(applyAndAndOrOperators(AdminGetLocalesParamsFields))
