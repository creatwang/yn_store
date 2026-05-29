import { z } from "zod"
import { paginationSchema, metadataSchema } from "./common"

export const orderStatusEnum = z.enum([
  "pending",
  "completed",
  "archived",
  "canceled",
  "requires_action",
  "draft",
])

const addressSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  company: z.string().optional(),
  address_1: z.string().optional(),
  address_2: z.string().optional(),
  city: z.string().optional(),
  country_code: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  phone: z.string().optional(),
})

export const listOrdersSchema = paginationSchema.extend({
  q: z.string().optional(),
  status: orderStatusEnum.optional(),
  customer_id: z.string().optional(),
  region_id: z.string().optional(),
  sales_channel_id: z.string().optional(),
  created_at: z.object({
    $gte: z.string().optional(),
    $lte: z.string().optional(),
    $gt: z.string().optional(),
    $lt: z.string().optional(),
  }).optional(),
  updated_at: z.object({
    $gte: z.string().optional(),
    $lte: z.string().optional(),
    $gt: z.string().optional(),
    $lt: z.string().optional(),
  }).optional(),
  fields: z.string().optional(),
})

export type ListOrdersQuery = z.infer<typeof listOrdersSchema>

export const createOrderSchema = z.object({
  region_id: z.string().optional(),
  customer_id: z.string().optional(),
  sales_channel_id: z.string().optional(),
  email: z.string().email().optional(),
  currency_code: z.string().optional(),
  metadata: metadataSchema.optional(),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>

export const updateOrderSchema = z.object({
  email: z.string().email().optional(),
  region_id: z.string().optional(),
  customer_id: z.string().optional(),
  sales_channel_id: z.string().optional(),
  currency_code: z.string().optional(),
  locale: z.string().optional(),
  shipping_address: addressSchema.optional(),
  billing_address: addressSchema.optional(),
  metadata: metadataSchema.optional(),
})

export type UpdateOrderInput = z.infer<typeof updateOrderSchema>

export const createCreditLineSchema = z.object({
  amount: z.number().positive(),
  reference: z.string(),
  reference_id: z.string(),
  metadata: metadataSchema.optional(),
})

export type CreateCreditLineInput = z.infer<typeof createCreditLineSchema>

export const requestTransferSchema = z.object({
  customer_id: z.string().min(1),
  description: z.string().optional(),
  internal_note: z.string().optional(),
  update_order_email: z.boolean().optional(),
})

export type RequestTransferInput = z.infer<typeof requestTransferSchema>

export const listOrderChangesSchema = paginationSchema.extend({
  status: z.string().optional(),
  change_type: z.string().optional(),
})

export type ListOrderChangesQuery = z.infer<typeof listOrderChangesSchema>

export const storeRequestTransferSchema = z.object({
  note: z.string().optional(),
})

export type StoreRequestTransferInput = z.infer<typeof storeRequestTransferSchema>

export const storeTransferActionSchema = z.object({
  token: z.string().optional(),
})

export type StoreTransferActionInput = z.infer<typeof storeTransferActionSchema>

export const addLineItemToOrderSchema = z.object({
  variant_id: z.string().min(1),
  quantity: z.number().min(1),
  unit_price: z.number().positive().optional(),
})

export type AddLineItemToOrderInput = z.infer<typeof addLineItemToOrderSchema>

export const updateOrderLineItemSchema = z.object({
  quantity: z.number().min(0).optional(),
  unit_price: z.number().positive().optional(),
})

export type UpdateOrderLineItemInput = z.infer<typeof updateOrderLineItemSchema>

export const addShippingMethodToOrderSchema = z.object({
  shipping_option_id: z.string().min(1),
  data: z.record(z.string(), z.unknown()).optional(),
})

export type AddShippingMethodToOrderInput = z.infer<typeof addShippingMethodToOrderSchema>
