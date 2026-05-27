import { z } from "zod"

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  order: z.string().optional(),
})

export type PaginationQuery = z.infer<typeof paginationSchema>
