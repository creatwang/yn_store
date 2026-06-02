import { z } from "zod"

export const metadataSchema = z.record(z.string(), z.unknown())

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  order: z.string().optional(),
})

export type PaginationQuery = z.infer<typeof paginationSchema>

// Re-export official shared validators for convenience
export {
  AddressPayload,
  BigNumberInput,
  booleanString,
  applyAndAndOrOperators,
} from "./helpers/common-validators"
export {
  createFindParams,
  createSelectParams,
  createOperatorMap,
  createBatchBody,
  createLinkBody,
  WithAdditionalData,
} from "./helpers/validators"

