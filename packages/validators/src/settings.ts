import { z } from "zod"

// ── Product Tags ──────────────────────────────────────────────
export const listProductTagsSchema = z.object({
  limit: z.coerce.number().min(1).default(50),
  offset: z.coerce.number().min(0).default(0),
  q: z.string().optional(),
  order: z.string().optional(),
})

export type ListProductTagsQuery = z.infer<typeof listProductTagsSchema>

export const createProductTagSchema = z.object({
  value: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateProductTagInput = z.infer<typeof createProductTagSchema>

export const updateProductTagSchema = createProductTagSchema.partial()

export type UpdateProductTagInput = z.infer<typeof updateProductTagSchema>

// ── Product Types ─────────────────────────────────────────────
export const listProductTypesSchema = z.object({
  limit: z.coerce.number().min(1).default(50),
  offset: z.coerce.number().min(0).default(0),
  q: z.string().optional(),
  order: z.string().optional(),
})

export type ListProductTypesQuery = z.infer<typeof listProductTypesSchema>

export const createProductTypeSchema = z.object({
  value: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateProductTypeInput = z.infer<typeof createProductTypeSchema>

export const updateProductTypeSchema = createProductTypeSchema.partial()

export type UpdateProductTypeInput = z.infer<typeof updateProductTypeSchema>

// ── Tax Regions ───────────────────────────────────────────────
export const listTaxRegionsSchema = z.object({
  limit: z.coerce.number().min(1).default(50),
  offset: z.coerce.number().min(0).default(0),
  q: z.string().optional(),
  order: z.string().optional(),
})

export type ListTaxRegionsQuery = z.infer<typeof listTaxRegionsSchema>

export const createTaxRegionSchema = z.object({
  country_code: z.string().min(1),
  province_code: z.string().nullish(),
  parent_id: z.string().nullish(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateTaxRegionInput = z.infer<typeof createTaxRegionSchema>

export const updateTaxRegionSchema = createTaxRegionSchema.partial()

export type UpdateTaxRegionInput = z.infer<typeof updateTaxRegionSchema>

// ── Return Reasons ────────────────────────────────────────────
export const listReturnReasonsSchema = z.object({
  limit: z.coerce.number().min(1).default(50),
  offset: z.coerce.number().min(0).default(0),
  q: z.string().optional(),
  order: z.string().optional(),
})

export type ListReturnReasonsQuery = z.infer<typeof listReturnReasonsSchema>

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

// ── Refund Reasons ────────────────────────────────────────────
export const listRefundReasonsSchema = z.object({
  limit: z.coerce.number().min(1).default(50),
  offset: z.coerce.number().min(0).default(0),
  q: z.string().optional(),
  order: z.string().optional(),
})

export type ListRefundReasonsQuery = z.infer<typeof listRefundReasonsSchema>

export const createRefundReasonSchema = z.object({
  label: z.string().min(1),
  code: z.string().min(1),
  description: z.string().nullish(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateRefundReasonInput = z.infer<typeof createRefundReasonSchema>

export const updateRefundReasonSchema = createRefundReasonSchema.partial()

export type UpdateRefundReasonInput = z.infer<typeof updateRefundReasonSchema>
