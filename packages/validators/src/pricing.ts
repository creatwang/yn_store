import { z } from "zod"
import { metadataSchema } from "./common"

export const listPriceListsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  status: z.enum(["draft", "active", "expired"]).optional(),
})

export type ListPriceListsQuery = z.infer<typeof listPriceListsSchema>

export const createPriceListSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(["draft", "active"]).default("draft"),
  type: z.enum(["sale", "override"]).default("sale"),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  metadata: metadataSchema.optional(),
})

export type CreatePriceListInput = z.infer<typeof createPriceListSchema>

export const updatePriceListSchema = createPriceListSchema.partial()

export type UpdatePriceListInput = z.infer<typeof updatePriceListSchema>