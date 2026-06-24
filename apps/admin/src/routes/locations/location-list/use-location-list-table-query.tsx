import { useTablePageSize } from "../../../hooks/table/table-pagination"
// @ts-nocheck
import { HttpTypes } from "@medusajs/types"
import { useQueryParams } from "../../../hooks/use-query-params"

export const useLocationListTableQuery = ({
  pageSize: pageSizeProp,
  prefix,
}: {
  pageSize?: number
  prefix?: string
}) => {
  const pageSize = useTablePageSize(prefix, pageSizeProp)
  const queryObject = useQueryParams(["order", "offset", "q"], prefix)

  const { offset, ...rest } = queryObject

  const searchParams: HttpTypes.AdminStockLocationListParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    ...rest,
  }

  return searchParams
}
