/** Auto-synced from medusajs/medusa v2.15.3 — do not edit manually */
import { z } from "zod"
import { createFindParams } from "../../../helpers/validators"

export type StoreGetPaymentProvidersParamsType = z.infer<
  typeof StoreGetPaymentProvidersParams
>
export const StoreGetPaymentProvidersParams = createFindParams({
  limit: 20,
  offset: 0,
}).merge(
  z.object({
    region_id: z.string(),
  })
)
