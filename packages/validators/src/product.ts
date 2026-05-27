import { z } from "zod"
import { paginationSchema } from "./common"

export const productStatusEnum = z.enum([
  "draft",
  "proposed",
  "published",
  "rejected",
])

export const listProductsSchema = paginationSchema.extend({
  q: z.string().optional(),
  status: productStatusEnum.optional(),
})

export type ListProductsQuery = z.infer<typeof listProductsSchema>

export const listStoreProductsSchema = paginationSchema.extend({
  q: z.string().optional(),
  category_id: z.string().optional(),
})

export type ListStoreProductsQuery = z.infer<typeof listStoreProductsSchema>

export const createProductSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  handle: z.string().optional(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  status: productStatusEnum.default("draft"),
  thumbnail: z.string().url().optional().or(z.literal("")),
  discountable: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateProductInput = z.infer<typeof createProductSchema>

export const updateProductSchema = createProductSchema.partial()

export type UpdateProductInput = z.infer<typeof updateProductSchema>
