// @ts-nocheck
import { HttpTypes } from "@medusajs/types"
import { useQueryParams } from "../../../../../hooks/use-query-params"

export const useLocationLevelTableQuery = ({
  pageSize = 20,
  prefix,
}: {
  pageSize?: number
  prefix?: string
}) => {
  const raw = useQueryParams(
    [
      "order",
      "offset",
      "q",
      "location_id",
      "stocked_quantity",
      "reserved_quantity",
      "incoming_quantity",
    ],
    prefix,
  )

  const { offset, ...rest } = raw

  const searchParams: HttpTypes.AdminInventoryLevelFilters = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    ...rest,
  }

  return {
    searchParams,
    raw,
  }
}
