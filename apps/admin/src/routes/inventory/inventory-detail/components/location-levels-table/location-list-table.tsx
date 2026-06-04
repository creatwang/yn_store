// @ts-nocheck
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { _DataTable } from "../../../../../components/table/data-table"
import { useInventoryItemLevels } from "../../../../../hooks/api/inventory"
import { useDataTable } from "../../../../../hooks/use-data-table"
import { useInventoryLocationLevelTableColumns } from "./use-inventory-location-level-table-columns"
import { useLocationLevelTableFilters } from "./use-location-level-table-filters"
import { useLocationLevelTableQuery } from "./use-location-list-table-query"

const PREFIX = "invlvl"

function applyLocationLevelQuery(
  rows: Array<Record<string, unknown>>,
  query: Record<string, string | undefined>,
) {
  let result = [...rows]

  const locationId = query.location_id
  if (locationId) {
    let parsed: string[] = []
    try {
      parsed = JSON.parse(locationId)
    } catch {
      parsed = [locationId]
    }
    const ids = new Set(parsed)
    result = result.filter((row) => ids.has(row.location_id as string))
  }

  const search = query.q?.trim().toLowerCase()
  if (search) {
    result = result.filter((row) => {
      const name =
        (row.stock_locations as { name?: string }[])?.[0]?.name ??
        (row.location_id as string)
      return String(name).toLowerCase().includes(search)
    })
  }

  const order = query.order
  if (order) {
    const desc = order.startsWith("-")
    const key = desc ? order.slice(1) : order
    result.sort((a, b) => {
      const left = Number(a[key] ?? 0)
      const right = Number(b[key] ?? 0)
      return desc ? right - left : left - right
    })
  }

  return result
}

export const ItemLocationListTable = ({
  inventory_item_id,
}: {
  inventory_item_id: string
}) => {
  const { t } = useTranslation()
  const { raw } = useLocationLevelTableQuery({ prefix: PREFIX })
  const filters = useLocationLevelTableFilters()
  const columns = useInventoryLocationLevelTableColumns()

  const {
    inventory_levels,
    isPending: isLoading,
    isError,
    error,
  } = useInventoryItemLevels(inventory_item_id, {
    fields: "+stock_locations.id,+stock_locations.name",
  })

  const filteredLevels = useMemo(
    () => applyLocationLevelQuery(inventory_levels ?? [], raw),
    [inventory_levels, raw],
  )

  const rowCount = filteredLevels.length

  const { table } = useDataTable({
    data: filteredLevels,
    columns,
    count: rowCount,
    pageSize: rowCount || 20,
    enablePagination: false,
    getRowId: (row) => row.id,
    prefix: PREFIX,
  })

  if (isError) {
    throw error
  }

  return (
    <_DataTable
      table={table}
      columns={columns}
      count={rowCount}
      pageSize={rowCount || 20}
      isLoading={isLoading}
      filters={filters}
      queryObject={raw}
      search
      prefix={PREFIX}
      orderBy={[
        { key: "stocked_quantity", label: t("fields.inStock") },
        { key: "reserved_quantity", label: t("inventory.reserved") },
        { key: "available_quantity", label: t("inventory.available") },
      ]}
      noRecords={{
        message: t("general.noRecordsTitle"),
      }}
    />
  )
}
