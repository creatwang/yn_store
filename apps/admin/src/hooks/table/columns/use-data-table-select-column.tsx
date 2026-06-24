import { Checkbox } from "@medusajs/ui"
import { createColumnHelper, DisplayColumnDef } from "@tanstack/react-table"
import { useMemo } from "react"

const columnHelper = createColumnHelper<unknown>()

export const useDataTableSelectColumn = <TData,>(): DisplayColumnDef<TData> => {
  return useMemo(
    () =>
      columnHelper.display({
        id: "select",
        header: ({ table }) => {
          return (
            <Checkbox
              checked={
                table.getIsSomePageRowsSelected()
                  ? "indeterminate"
                  : table.getIsAllPageRowsSelected()
              }
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(!!value)
              }
            />
          )
        },
        cell: ({ row }) => {
          return (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              onClick={(e) => {
                e.stopPropagation()
              }}
            />
          )
        },
      }) as DisplayColumnDef<TData>,
    []
  )
}
