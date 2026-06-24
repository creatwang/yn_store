import { useTablePageSize } from "../../../../../hooks/table/table-pagination"
// @ts-nocheck
import { HttpTypes, PriceListStatus } from "@medusajs/types"
import { useQueryParams } from "../../../../../hooks/use-query-params"

export const usePricingTableQuery = ({
  pageSize: pageSizeProp,
  prefix,
}: {
  pageSize?: number
  prefix?: string
}) => {
  const pageSize = useTablePageSize(prefix, pageSizeProp)
  const raw = useQueryParams(["offset", "q", "order", "status"], prefix)

  const searchParams: HttpTypes.AdminPriceListListParams = {
    limit: pageSize,
    offset: raw.offset ? Number(raw.offset) : 0,
    order: raw.order,
    status: raw.status?.split(",") as PriceListStatus[],
    q: raw.q,
  }

  return {
    searchParams,
    raw,
  }
}
