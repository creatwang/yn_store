import { z } from "zod"
import { metadataSchema } from "./common"

export const listFulfillmentsSchema = z.object({
  limit: z.coerce.number().min(1).default(50),
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
  location_id: z.string().optional(),
  shipping_option_id: z.string().optional(),
  no_notification: z.boolean().optional(),
  tracking_numbers: z.array(z.string()).optional(),
  tracking_url: z.string().url().optional(),
  metadata: metadataSchema.optional(),
})

export type CreateFulfillmentInput = z.infer<typeof createFulfillmentSchema>

export const cancelFulfillmentSchema = z.object({
  no_notification: z.boolean().optional(),
})

export type CancelFulfillmentInput = z.infer<typeof cancelFulfillmentSchema>

const labelSchema = z.object({
  tracking_number: z.string(),
  tracking_url: z.string(),
  label_url: z.string(),
})

export const createShipmentSchema = z.object({
  items: z.array(z.object({
    item_id: z.string().min(1),
    quantity: z.number().min(1),
  })),
  labels: z.array(labelSchema).optional(),
  no_notification: z.boolean().optional(),
  metadata: metadataSchema.optional(),
})

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>

export const markAsDeliveredSchema = z.object({
  no_notification: z.boolean().optional(),
})

export type MarkAsDeliveredInput = z.infer<typeof markAsDeliveredSchema>
