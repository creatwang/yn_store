import { useTablePageSize } from "../../../../../hooks/table/table-pagination"
// @ts-nocheck
import { useQueryParams } from "../../../../../hooks/use-query-params"

export const useCategoryTableQuery = ({
  pageSize: pageSizeProp,
  prefix,
}: {
  pageSize?: number
  prefix?: string
}) => {
  const pageSize = useTablePageSize(prefix, pageSizeProp)
  const raw = useQueryParams(["q", "offset", "order"], prefix)

  const searchParams = {
    q: raw.q,
    limit: pageSize,
    offset: raw.offset ? Number(raw.offset) : 0,
    order: raw.order,
  }

  return {
    raw,
    searchParams,
  }
}
