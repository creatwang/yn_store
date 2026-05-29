import { z } from "zod"
import { paginationSchema, metadataSchema } from "./common"

export const listClaimsSchema = paginationSchema.extend({
  status: z.string().optional(),
  order_id: z.string().optional(),
})

export type ListClaimsQuery = z.infer<typeof listClaimsSchema>

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

export const listExchangesSchema = paginationSchema.extend({
  order_id: z.string().optional(),
})

export type ListExchangesQuery = z.infer<typeof listExchangesSchema>

export const createExchangeSchema = z.object({
  order_id: z.string().min(1),
  order_version: z.number().int().positive().optional(),
  difference_due: z.number().optional(),
  allow_backorder: z.boolean().optional(),
  metadata: metadataSchema.optional(),
})

export type CreateExchangeInput = z.infer<typeof createExchangeSchema>
