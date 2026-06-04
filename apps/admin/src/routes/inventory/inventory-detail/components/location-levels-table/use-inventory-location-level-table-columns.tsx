// @ts-nocheck
import { AdminInventoryLevel } from "@medusajs/types"
import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { PlaceholderCell } from "../../../../../components/table/table-cells/common/placeholder-cell"
import { LocationLevelActions } from "./location-level-actions"

const columnHelper = createColumnHelper<AdminInventoryLevel>()

export const useInventoryLocationLevelTableColumns = () => {
  const { t } = useTranslation()

  return useMemo(
    () => [
      columnHelper.accessor(
        (row) => row.stock_locations?.[0]?.name ?? row.location_id,
        {
          id: "location",
          header: t("fields.location"),
          cell: ({ getValue }) => {
            const locationName = getValue()

            if (!locationName) {
              return <PlaceholderCell />
            }

            return (
              <div className="flex size-full items-center overflow-hidden">
                <span className="truncate">{String(locationName)}</span>
              </div>
            )
          },
        },
      ),
      columnHelper.accessor("reserved_quantity", {
        header: t("inventory.reserved"),
        cell: ({ getValue }) => {
          const quantity = getValue()

          if (Number.isNaN(quantity)) {
            return <PlaceholderCell />
          }

          return (
            <div className="flex size-full items-center overflow-hidden">
              <span className="truncate">{quantity}</span>
            </div>
          )
        },
      }),
      columnHelper.accessor("stocked_quantity", {
        header: t("fields.inStock"),
        cell: ({ getValue }) => {
          const quantity = getValue()

          if (Number.isNaN(quantity)) {
            return <PlaceholderCell />
          }

          return (
            <div className="flex size-full items-center overflow-hidden">
              <span className="truncate">{quantity}</span>
            </div>
          )
        },
      }),
      columnHelper.accessor("available_quantity", {
        header: t("inventory.available"),
        cell: ({ getValue }) => {
          const quantity = getValue()

          if (Number.isNaN(quantity)) {
            return <PlaceholderCell />
          }

          return (
            <div className="flex size-full items-center overflow-hidden">
              <span className="truncate">{quantity}</span>
            </div>
          )
        },
      }),
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => <LocationLevelActions level={row.original} />,
      }),
    ],
    [t],
  )
}
