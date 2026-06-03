import type { z } from "zod"
import { AdminGetOrdersParams } from "@my-store/validators/admin-list-params"
import { useQueryParams } from "../../use-query-params"

type AdminOrderListQuery = z.input<typeof AdminGetOrdersParams>

type UseOrderTableQueryProps = {
  prefix?: string
  pageSize?: number
}

export const useOrderTableQuery = ({
  prefix,
  pageSize = 20,
}: UseOrderTableQueryProps) => {
  const queryObject = useQueryParams(
    [
      "offset",
      "q",
      "created_at",
      "updated_at",
      "region_id",
      "sales_channel_id",
      "order",
      "total",
    ],
    prefix,
  )

  const {
    offset,
    sales_channel_id,
    created_at,
    updated_at,
    region_id,
    q,
    order,
    total,
  } = queryObject

  const searchParams: AdminOrderListQuery = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    sales_channel_id: sales_channel_id?.split(","),
    created_at: created_at ? JSON.parse(created_at) : undefined,
    updated_at: updated_at ? JSON.parse(updated_at) : undefined,
    region_id: region_id?.split(","),
    order: order ? order : "-created_at",
    q,
    ...(total ? { total: JSON.parse(total) } : {}),
  }

  return {
    searchParams,
    raw: queryObject,
  }
}
