import { z } from "zod"

export const createProductTagSchema = z.object({
  value: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateProductTagInput = z.infer<typeof createProductTagSchema>

export const updateProductTagSchema = createProductTagSchema.partial()

export type UpdateProductTagInput = z.infer<typeof updateProductTagSchema>

export const createProductTypeSchema = z.object({
  value: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateProductTypeInput = z.infer<typeof createProductTypeSchema>

export const updateProductTypeSchema = createProductTypeSchema.partial()

export type UpdateProductTypeInput = z.infer<typeof updateProductTypeSchema>

export const createTaxRegionSchema = z.object({
  country_code: z.string().min(1),
  province_code: z.string().nullish(),
  parent_id: z.string().nullish(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateTaxRegionInput = z.infer<typeof createTaxRegionSchema>

export const updateTaxRegionSchema = createTaxRegionSchema.partial()

export type UpdateTaxRegionInput = z.infer<typeof updateTaxRegionSchema>

export const createReturnReasonSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  description: z.string().nullish(),
  parent_return_reason_id: z.string().nullish(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateReturnReasonInput = z.infer<typeof createReturnReasonSchema>

export const updateReturnReasonSchema = createReturnReasonSchema.partial()

export type UpdateReturnReasonInput = z.infer<typeof updateReturnReasonSchema>

export const createRefundReasonSchema = z.object({
  label: z.string().min(1),
  code: z.string().min(1),
  description: z.string().nullish(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateRefundReasonInput = z.infer<typeof createRefundReasonSchema>

export const updateRefundReasonSchema = createRefundReasonSchema.partial()

export type UpdateRefundReasonInput = z.infer<typeof updateRefundReasonSchema>
