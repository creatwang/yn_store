import { z } from "zod"
import { metadataSchema } from "./common"
import { createFindParams } from "./helpers/validators"

export const listInventoryItemsSchema = createFindParams({ limit: 50 }).extend({
  q: z.string().optional(),
  location_id: z.string().optional(),
})

export type ListInventoryItemsQuery = z.infer<typeof listInventoryItemsSchema>

export const createInventoryItemSchema = z.object({
  sku: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  requires_shipping: z.boolean().default(true),
  metadata: metadataSchema.optional(),
})

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>

export const updateInventoryItemSchema = z.object({
  sku: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  requires_shipping: z.boolean().optional(),
  metadata: metadataSchema.optional(),
})

export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>

export const createReservationSchema = z.object({
  line_item_id: z.string().optional(),
  location_id: z.string().min(1),
  inventory_item_id: z.string().min(1),
  quantity: z.number().min(1),
  allow_backorder: z.boolean().default(false),
  metadata: metadataSchema.optional(),
})

export type CreateReservationInput = z.infer<typeof createReservationSchema>