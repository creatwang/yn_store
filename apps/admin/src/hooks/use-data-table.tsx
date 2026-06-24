import {
  ColumnDef,
  OnChangeFn,
  Row,
  RowSelectionState,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useState } from "react"
import { useTablePagination } from "./table/table-pagination"

type UseDataTableProps<TData> = {
  data?: TData[]
  columns: ColumnDef<TData, any>[]
  count?: number
  pageSize?: number
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean)
  rowSelection?: {
    state: RowSelectionState
    updater: OnChangeFn<RowSelectionState>
  }
  enablePagination?: boolean
  enableExpandableRows?: boolean
  getRowId?: (original: TData, index: number) => string
  getSubRows?: (original: TData) => TData[]
  meta?: Record<string, unknown>
  prefix?: string
}

export const useDataTable = <TData,>({
  data = [],
  columns,
  count = 0,
  pageSize: pageSizeOverride,
  enablePagination = true,
  enableRowSelection = false,
  enableExpandableRows = false,
  rowSelection: _rowSelection,
  getSubRows,
  getRowId,
  meta,
  prefix,
}: UseDataTableProps<TData>) => {
  const { pagination, onPaginationChange } = useTablePagination(
    prefix,
    pageSizeOverride,
    enablePagination,
  )
  const { pageSize } = pagination

  const [localRowSelection, setLocalRowSelection] = useState({})
  const rowSelection = _rowSelection?.state ?? localRowSelection
  const setRowSelection = _rowSelection?.updater ?? setLocalRowSelection

  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection: rowSelection,
      pagination,
    },
    pageCount: Math.ceil((count ?? 0) / pageSize),
    enableRowSelection,
    getRowId,
    getSubRows,
    onRowSelectionChange: enableRowSelection ? setRowSelection : undefined,
    onPaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination
      ? getPaginationRowModel()
      : undefined,
    getExpandedRowModel: enableExpandableRows
      ? getExpandedRowModel()
      : undefined,
    manualPagination: enablePagination ? true : undefined,
    meta,
  })

  return { table }
}
