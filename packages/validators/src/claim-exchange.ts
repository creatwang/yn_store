import { z } from "zod"
import { metadataSchema } from "./common"

export const createClaimSchema = z.object({
  order_id: z.string().min(1),
  order_version: z.number().int().positive().optional(),
  type: z.enum(["refund", "replace"]).default("refund"),
  refund_amount: z.number().positive().optional(),
  claim_items: z.array(z.object({
    item_id: z.string().min(1),
    quantity: z.number().min(1),
    reason: z.string().optional(),
    note: z.string().optional(),
    is_additional_item: z.boolean().optional(),
  })).optional(),
  metadata: metadataSchema.optional(),
})

export type CreateClaimInput = z.infer<typeof createClaimSchema>

export const createExchangeSchema = z.object({
  order_id: z.string().min(1),
  order_version: z.number().int().positive().optional(),
  difference_due: z.number().optional(),
  allow_backorder: z.boolean().optional(),
  metadata: metadataSchema.optional(),
})

export type CreateExchangeInput = z.infer<typeof createExchangeSchema>
