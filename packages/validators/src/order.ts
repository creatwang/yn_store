import { z } from "zod"
import { paginationSchema } from "./common"

export const orderStatusEnum = z.enum([
  "pending",
  "completed",
  "archived",
  "canceled",
  "requires_action",
  "draft",
])

export const listOrdersSchema = paginationSchema.extend({
  q: z.string().optional(),
  status: orderStatusEnum.optional(),
  customer_id: z.string().optional(),
})

export type ListOrdersQuery = z.infer<typeof listOrdersSchema>

export const createOrderSchema = z.object({
  region_id: z.string().optional(),
  customer_id: z.string().optional(),
  sales_channel_id: z.string().optional(),
  email: z.string().email().optional(),
  currency_code: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>

export const updateOrderSchema = createOrderSchema.partial()

export type UpdateOrderInput = z.infer<typeof updateOrderSchema>
