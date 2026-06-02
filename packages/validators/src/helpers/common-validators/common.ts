/** Ported from medusajs/medusa packages/medusa/src/api/utils/common-validators/common.ts */
import { z } from "zod"

export const AddressPayload = z
  .object({
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    phone: z.string().nullish(),
    company: z.string().nullish(),
    address_1: z.string().nullish(),
    address_2: z.string().nullish(),
    city: z.string().nullish(),
    country_code: z.string().nullish(),
    province: z.string().nullish(),
    postal_code: z.string().nullish(),
    metadata: z.record(z.string(), z.unknown()).nullish(),
  })
  .strict()

export const BigNumberInput = z.union([
  z.number(),
  z.string(),
  z.object({
    value: z.string(),
    precision: z.number(),
  }),
])

export const applyAndAndOrOperators = <T extends z.ZodObject<any>>(schema: T) => {
  return schema.merge(
    z.object({
      $and: z.lazy(() => schema.array()).optional(),
      $or: z.lazy(() => schema.array()).optional(),
    })
  )
}

export const booleanString = () =>
  z
    .union([z.boolean(), z.string()])
    .refine((value) => ["true", "false"].includes(value.toString().toLowerCase()))
    .transform((value) => value.toString().toLowerCase() === "true")

export function recursivelyNormalizeSchema<
  Data extends object,
  NormalizedData extends object,
>(transform: (data: Data) => NormalizedData): (data: Data) => NormalizedData {
  return (data: any) => {
    const normalizedData = transform(data)

    Object.keys(normalizedData)
      .filter((key) => ["$and", "$or"].includes(key))
      .forEach((key) => {
        ;(normalizedData as Record<string, unknown[]>)[key] = (
          normalizedData as Record<string, unknown[]>
        )[key].map((item) => transform(item as Data))
      })

    return normalizedData
  }
}
