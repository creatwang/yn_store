import { useTablePageSize } from "../../../../../hooks/table/table-pagination"
// @ts-nocheck
import { HttpTypes } from "@medusajs/types"
import { useQueryParams } from "../../../../../hooks/use-query-params"

export const useReservationTableQuery = ({
  pageSize: pageSizeProp,
  prefix,
}: {
  pageSize?: number
  prefix?: string
}) => {
  const pageSize = useTablePageSize(prefix, pageSizeProp)
  const raw = useQueryParams(
    ["location_id", "offset", "created_at", "quantity", "updated_at", "order"],
    prefix
  )

  const { location_id, created_at, updated_at, order, offset, ...rest } = raw

  const searchParams: HttpTypes.AdminGetReservationsParams = {
    limit: pageSize,
    offset: offset ? parseInt(offset) : undefined,
    location_id: location_id,
    created_at: created_at ? JSON.parse(created_at) : undefined,
    updated_at: updated_at ? JSON.parse(updated_at) : undefined,
    order: order ?? "-created_at",
    ...rest,
  } as HttpTypes.AdminGetReservationsParams

  return {
    searchParams,
    raw,
  }
}
