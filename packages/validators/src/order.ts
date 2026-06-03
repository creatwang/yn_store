import { z } from "zod"
import { metadataSchema } from "./common"

export const orderStatusEnum = z.enum([
  "pending",
  "completed",
  "archived",
  "canceled",
  "requires_action",
  "draft",
])

/** 对齐 Medusa AddressPayload（common-validators/common.js） */
const addressSchema = z.object({
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  phone: z.string().nullish(),
  company: z.string().nullish(),
  address_1: z.string().nullish(),
  address_2: z.string().nullish(),
  city: z.string().nullish(),
  country_code: z.string().nullish(),
  province: z.string().nullish(),
  postal_code: z.string().nullish(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
}).strict()

/** 对齐 Medusa CreateOrderLineItemDTO / AdminCreateDraftOrder Item */
export const createOrderItemSchema = z
  .object({
    variant_id: z.string().min(1).optional(),
    title: z.string().nullish(),
    quantity: z.number().min(1),
    unit_price: z.number().positive().optional(),
    metadata: metadataSchema.optional(),
  })
  .refine(
    (item) => Boolean(item.variant_id?.trim() || item.title?.trim()),
    { message: "Items must have either a variant_id or a title" },
  )

export type CreateOrderItemInput = z.infer<typeof createOrderItemSchema>

export const createOrderSchema = z.object({
  region_id: z.string().optional(),
  customer_id: z.string().optional(),
  sales_channel_id: z.string().optional(),
  email: z.string().email().optional(),
  currency_code: z.string().optional(),
  shipping_address: addressSchema.optional(),
  billing_address: addressSchema.optional(),
  metadata: metadataSchema.optional(),
  items: z.array(createOrderItemSchema).optional(),
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
