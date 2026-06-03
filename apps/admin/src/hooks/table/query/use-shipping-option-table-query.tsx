import { HttpTypes } from "@medusajs/types"
import { useQueryParams } from "../../use-query-params"

type UseShippingOptionTableQueryProps = {
  isReturn?: boolean
  pageSize?: number
  prefix?: string
}

export const useShippingOptionTableQuery = ({
  isReturn,
  pageSize = 10,
  prefix,
}: UseShippingOptionTableQueryProps) => {
  const queryObject = useQueryParams(
    [
      "offset",
      "q",
      "order",
      "admin_only",
      "is_return",
      "created_at",
      "updated_at",
      "stock_location_id",
    ],
    prefix
  )

  const {
    offset,
    order,
    q,
    admin_only,
    is_return,
    created_at,
    updated_at,
    stock_location_id,
  } = queryObject

  const searchParams: HttpTypes.AdminShippingOptionListParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    is_return:
      isReturn != null
        ? isReturn
        : is_return === "true"
          ? true
          : is_return === "false"
            ? false
            : undefined,
    admin_only: admin_only === "true" ? true : admin_only === "false" ? false : undefined,
    q,
    order,
    stock_location_id,
    created_at: created_at ? JSON.parse(created_at) : undefined,
    updated_at: updated_at ? JSON.parse(updated_at) : undefined,
  }

  return {
    searchParams,
    raw: queryObject,
  }
}
