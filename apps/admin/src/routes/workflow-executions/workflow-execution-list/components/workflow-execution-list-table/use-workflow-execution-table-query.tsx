import { useTablePageSize } from "../../../../../hooks/table/table-pagination"
import { HttpTypes } from "@medusajs/types"
import { useQueryParams } from "../../../../../hooks/use-query-params"

export const useWorkflowExecutionTableQuery = ({
  pageSize: pageSizeProp,
  prefix,
}: {
  pageSize?: number
  prefix?: string
}) => {
  const pageSize = useTablePageSize(prefix, pageSizeProp)
  const raw = useQueryParams(
    ["q", "offset", "order", "workflow_id", "state", "created_at"],
    prefix
  )

  const { offset, order, workflow_id, state, created_at, ...rest } = raw

  const searchParams: HttpTypes.AdminGetWorkflowExecutionsParams = {
    limit: pageSize,
    offset: offset ? parseInt(offset) : 0,
    order: order ? order : "-created_at",
    workflow_id: workflow_id?.split(","),
    state: state?.split(","),
    created_at: created_at ? JSON.parse(created_at) : undefined,
    ...rest,
  }

  return {
    searchParams,
    raw,
  }
}
