import { z } from "zod"
import { metadataSchema } from "./common"

export const createReturnSchema = z.object({
  order_id: z.string().min(1),
  order_version: z.number().int().positive().optional(),
  location_id: z.string().optional(),
  refund_amount: z.number().positive().optional(),
  items: z.array(z.object({
    item_id: z.string().min(1),
    quantity: z.number().min(1),
    note: z.string().optional(),
  })).optional(),
  metadata: metadataSchema.optional(),
})

export type CreateReturnInput = z.infer<typeof createReturnSchema>

export const receiveReturnSchema = z.object({
  items: z.array(z.object({
    item_id: z.string().min(1),
    quantity: z.number().min(1),
    received_quantity: z.number().min(0).optional(),
    damaged_quantity: z.number().min(0).optional(),
  })),
})

export type ReceiveReturnInput = z.infer<typeof receiveReturnSchema>
