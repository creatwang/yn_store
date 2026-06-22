import { z } from "zod"

export const productStatusEnum = z.enum([
  "draft",
  "proposed",
  "published",
  "rejected",
])

export const createProductSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  handle: z.string().optional(),
  subtitle: z.string().nullish(),
  description: z.string().optional(),
  status: productStatusEnum.default("draft"),
  thumbnail: z.string().optional().nullable().or(z.literal("")),
  discountable: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).optional(),
  // 以下字段由前端 CreateProductForm 提交，透传到 backend 处理
  images: z.array(z.object({ url: z.string(), rank: z.number().optional() })).optional(),
  options: z.array(z.object({ title: z.string(), values: z.array(z.any()).optional() })).optional(),
  variants: z.array(z.any()).optional(),
  sales_channels: z.array(z.object({ id: z.string() })).optional(),
  tags: z.array(z.object({ id: z.string() })).optional(),
  categories: z.array(z.object({ id: z.string() })).optional(),
  type_id: z.string().nullable().optional(),
  collection_id: z.string().nullable().optional(),
  origin_country: z.string().optional(),
  material: z.string().nullish(),
  mid_code: z.string().optional(),
  hs_code: z.string().optional(),
  width: z.number().optional(),
  length: z.number().optional(),
  height: z.number().optional(),
  weight: z.number().optional(),
  is_giftcard: z.boolean().optional(),
  shipping_profile_id: z.string().optional(),
})

export type CreateProductInput = z.infer<typeof createProductSchema>

export const updateProductSchema = createProductSchema.partial()

export type UpdateProductInput = z.infer<typeof updateProductSchema>

export const batchDeleteProductsSchema = z.object({
  ids: z.array(z.string()).min(1, "至少选择一个产品"),
})

export type BatchDeleteProductsInput = z.infer<typeof batchDeleteProductsSchema>
