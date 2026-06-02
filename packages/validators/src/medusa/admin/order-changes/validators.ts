/** Auto-synced from medusajs/medusa v2.15.3 — do not edit manually */
import { z } from "zod"

import { createOperatorMap, createSelectParams } from "../../../helpers/validators"

export const AdminOrderChangeParams = createSelectParams().merge(
  z.object({
    id: z.union([z.string(), z.array(z.string())]).optional(),
    status: z.union([z.string(), z.array(z.string())]).optional(),
    change_type: z.union([z.string(), z.array(z.string())]).optional(),
    created_at: createOperatorMap().optional(),
    updated_at: createOperatorMap().optional(),
    deleted_at: createOperatorMap().optional(),
  })
)

export const AdminPostOrderChangesReqSchema = z.object({
  carry_over_promotions: z.boolean(),
})

export type AdminPostOrderChangesReqSchemaType = z.infer<
  typeof AdminPostOrderChangesReqSchema
>
