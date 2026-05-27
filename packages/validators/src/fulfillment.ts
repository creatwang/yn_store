import { z } from "zod"

export const listFulfillmentsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  order_id: z.string().optional(),
})

export type ListFulfillmentsQuery = z.infer<typeof listFulfillmentsSchema>

export const createFulfillmentSchema = z.object({
  order_id: z.string().min(1),
  items: z.array(z.object({
    item_id: z.string().min(1),
    quantity: z.number().min(1),
  })),
  tracking_numbers: z.array(z.string()).optional(),
  tracking_url: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export type CreateFulfillmentInput = z.infer<typeof createFulfillmentSchema>

export const cancelFulfillmentSchema = z.object({
  note: z.string().optional(),
})

export type CancelFulfillmentInput = z.infer<typeof cancelFulfillmentSchema>