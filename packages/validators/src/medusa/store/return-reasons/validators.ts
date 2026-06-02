/** Auto-synced from medusajs/medusa v2.15.3 — do not edit manually */
import { z } from "zod"
import { createFindParams, createSelectParams } from "../../../helpers/validators"

export type StoreReturnReasonParamsType = z.infer<
  typeof StoreReturnReasonParams
>
export const StoreReturnReasonParams = createSelectParams()

export type StoreReturnReasonsParamsType = z.infer<
  typeof StoreReturnReasonsParams
>
export const StoreReturnReasonsParams = createFindParams()
