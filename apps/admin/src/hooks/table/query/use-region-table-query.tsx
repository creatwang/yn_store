import { useTablePageSize } from "../table-pagination"
import { FindParams, HttpTypes } from "@medusajs/types"
import { useQueryParams } from "../../use-query-params"

type UseRegionTableQueryProps = {
  prefix?: string
  pageSize?: number
}

export const useRegionTableQuery = ({
  prefix,
  pageSize: pageSizeProp,
}: UseRegionTableQueryProps) => {
  const pageSize = useTablePageSize(prefix, pageSizeProp)
  const queryObject = useQueryParams(
    ["offset", "q", "order", "created_at", "updated_at"],
    prefix
  )

  const { offset, q, order, created_at, updated_at } = queryObject

  const searchParams: FindParams & HttpTypes.AdminRegionFilters = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    order,
    created_at: created_at ? JSON.parse(created_at) : undefined,
    updated_at: updated_at ? JSON.parse(updated_at) : undefined,
    q,
  }

  return {
    searchParams,
    raw: queryObject,
  }
}
