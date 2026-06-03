import { z } from "zod"
import { metadataSchema } from "./common"

export const createRegionSchema = z.object({
  name: z.string().min(1),
  currency_code: z.string().min(1),
  automatic_taxes: z.boolean().optional().default(true),
  is_tax_inclusive: z.boolean().optional().default(false),
  countries: z.array(z.string()).optional().default([]),
  payment_providers: z.array(z.string()).optional().default([]),
  metadata: metadataSchema.optional(),
})

export type CreateRegionInput = z.infer<typeof createRegionSchema>

export const updateRegionSchema = z.object({
  name: z.string().optional(),
  currency_code: z.string().optional(),
  automatic_taxes: z.boolean().optional(),
  is_tax_inclusive: z.boolean().optional(),
  countries: z.array(z.string()).optional(),
  payment_providers: z.array(z.string()).optional(),
  metadata: metadataSchema.optional(),
})

export type UpdateRegionInput = z.infer<typeof updateRegionSchema>

export const createSalesChannelSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  is_disabled: z.boolean().default(false),
  metadata: metadataSchema.optional(),
})

export type CreateSalesChannelInput = z.infer<typeof createSalesChannelSchema>

export const updateSalesChannelSchema = createSalesChannelSchema.partial()

export type UpdateSalesChannelInput = z.infer<typeof updateSalesChannelSchema>