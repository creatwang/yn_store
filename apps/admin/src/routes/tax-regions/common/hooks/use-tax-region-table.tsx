// @ts-nocheck
import { HttpTypes } from "@medusajs/types"
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useTablePagination } from "@/hooks/table/table-pagination"

type UseTaxRegionTableProps = {
  data?: HttpTypes.AdminTaxRegion[]
  count?: number
  pageSize?: number
  prefix?: string
}

export const useTaxRegionTable = ({
  data = [],
  count = 0,
  pageSize: pageSizeOverride,
  prefix,
}: UseTaxRegionTableProps) => {
  const { pagination, onPaginationChange } = useTablePagination(
    prefix,
    pageSizeOverride,
  )

  const table = useReactTable({
    data,
    columns: [],
    pageCount: Math.ceil(count / pagination.pageSize),
    state: {
      pagination,
    },
    getCoreRowModel: getCoreRowModel(),
    onPaginationChange,
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
  })

  return {
    table,
  }
}
