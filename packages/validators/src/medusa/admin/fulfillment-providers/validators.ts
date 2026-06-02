/** Auto-synced from medusajs/medusa v2.15.3 — do not edit manually */
import { z } from "zod"
import { booleanString } from "../../../helpers/common-validators"
import { createFindParams } from "../../../helpers/validators"

export type AdminFulfillmentProvidersParamsType = z.infer<
  typeof AdminFulfillmentProvidersParams
>
export const AdminFulfillmentProvidersParams = createFindParams({
  limit: 50,
  offset: 0,
})
  .merge(
    z.object({
      id: z.union([z.string(), z.array(z.string())]).optional(),
      stock_location_id: z.union([z.string(), z.array(z.string())]).optional(),
      is_enabled: booleanString().optional(),
      q: z.string().optional(),
    })
  )
  .strict()
