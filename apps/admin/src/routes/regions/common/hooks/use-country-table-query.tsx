import { useTablePageSize } from "../../../../hooks/table/table-pagination"
// @ts-nocheck
import { useQueryParams } from "../../../../hooks/use-query-params"

export const useCountryTableQuery = ({
  pageSize: pageSizeProp,
  prefix,
}: {
  pageSize?: number
  prefix?: string
}) => {
  const pageSize = useTablePageSize(prefix, pageSizeProp)
  const raw = useQueryParams(["order", "q", "offset"], prefix)

  const { offset, order, q } = raw

  const searchParams = {
    limit: pageSize,
    offset: offset ? parseInt(offset, 10) : 0,
    order,
    q,
  }

  return {
    searchParams,
    raw,
  }
}
