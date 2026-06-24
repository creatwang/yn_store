import { ComponentPropsWithoutRef } from "react"
import { TablePaginationBar } from "../../table/table-pagination-bar"

type LocalizedTablePaginationProps = ComponentPropsWithoutRef<
  typeof TablePaginationBar
>

export const LocalizedTablePagination = (
  props: LocalizedTablePaginationProps,
) => {
  return <TablePaginationBar {...props} />
}
