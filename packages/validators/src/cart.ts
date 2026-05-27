import { z } from "zod"
import { paginationSchema } from "./common"

export const createCartSchema = z.object({
  region_id: z.string().optional(),
  customer_id: z.string().optional(),
  sales_channel_id: z.string().optional(),
  email: z.string().email().optional(),
  currency_code: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateCartInput = z.infer<typeof createCartSchema>

export const updateCartSchema = createCartSchema.partial()

export type UpdateCartInput = z.infer<typeof updateCartSchema>

export const createCartLineItemSchema = z.object({
  variant_id: z.string().optional(),
  product_id: z.string().optional(),
  quantity: z.number().int().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateCartLineItemInput = z.infer<typeof createCartLineItemSchema>

export const updateCartLineItemSchema = createCartLineItemSchema.partial()

export type UpdateCartLineItemInput = z.infer<typeof updateCartLineItemSchema>

export const addToCartSchema = z.object({
  variant_id: z.string().min(1),
  product_id: z.string().optional(),
  title: z.string().optional(),
  quantity: z.number().int().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type AddToCartInput = z.infer<typeof addToCartSchema>

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1),
})

export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>
