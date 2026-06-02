/** Auto-synced from medusajs/medusa v2.15.3 — do not edit manually */
import { z } from "zod"
import { createSelectParams } from "../../../helpers/validators"

export type StoreGetPaymentCollectionParamsType = z.infer<
  typeof StoreGetPaymentCollectionParams
>
export const StoreGetPaymentCollectionParams = createSelectParams()

export type StoreCreatePaymentSessionType = z.infer<
  typeof StoreCreatePaymentSession
>
export const StoreCreatePaymentSession = z
  .object({
    provider_id: z.string(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()

export type StoreCreatePaymentCollectionType = z.infer<
  typeof StoreCreatePaymentCollection
>
export const StoreCreatePaymentCollection = z
  .object({
    cart_id: z.string(),
  })
  .strict()
