/** Auto-synced from medusajs/medusa v2.15.3 — do not edit manually */
import { z } from "zod"
import { createSelectParams } from "../../../../../../../helpers/validators"

export type AdminGetColumnsParamsType = z.infer<typeof AdminGetColumnsParams>
export const AdminGetColumnsParams = createSelectParams()
