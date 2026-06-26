import { z } from "zod"

// 参考: @medusajs/medusa/dist/api/admin/stores/validators.js (AdminUpdateStore)
export const updateStoreSchema = z.object({
  name: z.string().optional(),
  supported_currencies: z
    .array(
      z.object({
        currency_code: z.string(),
        is_default: z.boolean().optional(),
      })
    )
    .optional(),
  supported_locales: z
    .array(
      z.object({
        locale_code: z.string(),
      })
    )
    .optional(),
  default_sales_channel_id: z.string().nullish(),
  default_region_id: z.string().nullish(),
  default_location_id: z.string().nullish(),
  default_locale_code: z.string().nullish(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
})

export type UpdateStoreInput = z.infer<typeof updateStoreSchema>
