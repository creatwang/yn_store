import { z } from "zod"
import { paginationSchema } from "./common"

export const listCustomersSchema = paginationSchema.extend({
  q: z.string().optional(),
  has_account: z.boolean().optional(),
})

export type ListCustomersQuery = z.infer<typeof listCustomersSchema>

export const createCustomerSchema = z.object({
  company_name: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email("邮箱格式不正确"),
  phone: z.string().optional(),
  has_account: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>

export const updateCustomerSchema = createCustomerSchema.partial()

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>

export const createCustomerAddressSchema = z.object({
  address_name: z.string().optional(),
  is_default_shipping: z.boolean().default(false),
  is_default_billing: z.boolean().default(false),
  company: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  address_1: z.string().min(1, "地址不能为空"),
  address_2: z.string().optional(),
  city: z.string().min(1, "城市不能为空"),
  country_code: z.string().min(1, "国家不能为空"),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  phone: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateCustomerAddressInput = z.infer<typeof createCustomerAddressSchema>

export const updateCustomerAddressSchema = createCustomerAddressSchema.partial()

export type UpdateCustomerAddressInput = z.infer<typeof updateCustomerAddressSchema>
