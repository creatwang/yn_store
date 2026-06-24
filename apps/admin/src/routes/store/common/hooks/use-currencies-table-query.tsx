import { useTablePageSize } from "../../../../hooks/table/table-pagination"
// @ts-nocheck
import { useQueryParams } from "../../../../hooks/use-query-params"

export const useCurrenciesTableQuery = ({
  pageSize: pageSizeProp,
  prefix,
}: {
  pageSize?: number
  prefix?: string
}) => {
  const pageSize = useTablePageSize(prefix, pageSizeProp)
  const raw = useQueryParams(["order", "q", "offset"], prefix)

  const { offset, ...rest } = raw

  const searchParams = {
    limit: pageSize,
    offset: offset ? parseInt(offset) : 0,
    ...rest,
  }

  return { searchParams, raw }
}
