import { HttpTypes } from "@medusajs/types"
import { useQueryParams } from "../../use-query-params"

type UseDraftOrderTableQueryProps = {
  prefix?: string
  pageSize?: number
}

export const useDraftOrderTableQuery = ({
  prefix,
  pageSize = 20,
}: UseDraftOrderTableQueryProps) => {
  const queryObject = useQueryParams(
    [
      "offset",
      "q",
      "order",
      "customer_id",
      "region_id",
      "created_at",
      "updated_at",
    ],
    prefix,
  )

  const { offset, created_at, updated_at, ...rest } = queryObject

  const searchParams: HttpTypes.AdminDraftOrderListParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    created_at: created_at ? JSON.parse(created_at) : undefined,
    updated_at: updated_at ? JSON.parse(updated_at) : undefined,
    ...rest,
  }

  return {
    searchParams,
    raw: queryObject,
  }
}
