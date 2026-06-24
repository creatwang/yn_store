import { useTablePageSize } from "../../../../../hooks/table/table-pagination"
// @ts-nocheck
import { useQueryParams } from "../../../../../hooks/use-query-params"

export const useReservationsTableQuery = ({
  pageSize: pageSizeProp,
  prefix,
}: {
  pageSize?: number
  prefix?: string
}) => {
  const pageSize = useTablePageSize(prefix, pageSizeProp)
  const raw = useQueryParams(
    [
      "id",
      "location_id",
      "inventory_item_id",
      "quantity",
      "line_item_id",
      "description",
      "created_by",
    ],
    prefix
  )

  const { quantity, ...params } = raw

  const searchParams = {
    limit: pageSize,
    quantity: quantity ? JSON.parse(quantity) : undefined,
    ...params,
  }

  return {
    searchParams,
    raw,
  }
}
