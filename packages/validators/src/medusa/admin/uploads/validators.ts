/** Auto-synced from medusajs/medusa v2.15.3 — do not edit manually */
import { z, type ZodType } from "zod"
import { HttpTypes } from "../../../helpers/types"
import { createSelectParams } from "../../../helpers/validators"

export type AdminGetUploadParamsType = z.infer<typeof AdminGetUploadParams>
export const AdminGetUploadParams = createSelectParams()

export const AdminUploadPreSignedUrl = z.object({
  originalname: z.string(),
  mime_type: z.string(),
  size: z.number(),
  access: z.enum(["public", "private"]).optional(),
}) satisfies ZodType<HttpTypes.AdminUploadPreSignedUrlRequest>

export type AdminUploadPreSignedUrlType = z.infer<
  typeof AdminUploadPreSignedUrl
>
