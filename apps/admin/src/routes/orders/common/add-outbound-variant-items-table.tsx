// @ts-nocheck
import { OnChangeFn, RowSelectionState } from "@tanstack/react-table"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { _DataTable } from "../../../components/table/data-table"
import { useVariants } from "../../../hooks/api"
import { useDataTable } from "../../../hooks/use-data-table"
import { hasStockAtLocation } from "../../../lib/orders/rma-inventory"
import {
  useOrderEditItemsTableColumns,
} from "../order-create-edit/components/add-order-edit-items-table/use-order-edit-item-table-columns"
import {
  useOrderEditItemTableFilters,
} from "../order-create-edit/components/add-order-edit-items-table/use-order-edit-item-table-filters"
import {
  useOrderEditItemTableQuery,
} from "../order-create-edit/components/add-order-edit-items-table/use-order-edit-item-table-query"

const PAGE_SIZE = 50
const PREFIX = "rit"

type AddOutboundVariantItemsTableProps = {
  onSelectionChange: (ids: string[]) => void
  currencyCode: string
  selectedItems?: string[]
  locationId?: string
}

export function AddOutboundVariantItemsTable({
  onSelectionChange,
  currencyCode,
  selectedItems = [],
  locationId,
}: AddOutboundVariantItemsTableProps) {
  const { t } = useTranslation()

  const [rowSelection, setRowSelection] = useState<RowSelectionState>(
    selectedItems.reduce(
      (acc, id) => {
        acc[id] = true
        return acc
      },
      {} as RowSelectionState,
    ),
  )

  const updater: OnChangeFn<RowSelectionState> = (fn) => {
    const newState: RowSelectionState =
      typeof fn === "function" ? fn(rowSelection) : fn

    setRowSelection(newState)
    onSelectionChange(Object.keys(newState))
  }

  const { searchParams, raw } = useOrderEditItemTableQuery({
    pageSize: PAGE_SIZE,
    prefix: PREFIX,
  })

  const { variants = [], count } = useVariants({
    ...searchParams,
    fields: "*inventory_items.inventory.location_levels,+inventory_quantity",
  })

  const columns = useOrderEditItemsTableColumns(currencyCode)
  const filters = useOrderEditItemTableFilters()

  const { table } = useDataTable({
    data: variants,
    columns,
    count,
    enablePagination: true,
    getRowId: (row) => row.id,
    pageSize: PAGE_SIZE,
    enableRowSelection: (row) => {
      if (!row.original.manage_inventory) {
        return true
      }
      const levels =
        row.original.inventory_items?.[0]?.inventory?.location_levels ?? []
      if (locationId) {
        return hasStockAtLocation(levels, locationId)
      }
      return levels.some((l) => Number(l.available_quantity) > 0)
    },
    rowSelection: {
      state: rowSelection,
      updater,
    },
  })

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <_DataTable
        table={table}
        columns={columns}
        pageSize={PAGE_SIZE}
        count={count}
        filters={filters}
        pagination
        layout="fill"
        search
        orderBy={[
          { key: "product_id", label: t("fields.product") },
          { key: "title", label: t("fields.title") },
          { key: "sku", label: t("fields.sku") },
        ]}
        prefix={PREFIX}
        queryObject={raw}
      />
    </div>
  )
}
