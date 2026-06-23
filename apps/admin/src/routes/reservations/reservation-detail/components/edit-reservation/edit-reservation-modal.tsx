import { Heading } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import { RouteDrawer } from "../../../../../components/modals"
import {
  useInventoryItem,
  useInventoryItemLevels,
} from "../../../../../hooks/api/inventory"
import { useReservationItem } from "../../../../../hooks/api/reservations"
import { useStockLocations } from "../../../../../hooks/api/stock-locations"
import { EditReservationForm } from "./components/edit-reservation-form"

export const ReservationEdit = () => {
  const { id } = useParams()
  const { t } = useTranslation()

  const { reservation, isPending, isError, error } = useReservationItem(id!)
  const inventoryItemId = reservation?.inventory_item_id

  const { inventory_item: inventoryItem, isPending: isInventoryPending } =
    useInventoryItem(
      inventoryItemId!,
      { fields: "+location_levels,*location_levels.stock_locations" },
      { enabled: Boolean(inventoryItemId) },
    )

  const { inventory_levels, isPending: isLevelsPending } =
    useInventoryItemLevels(inventoryItemId!, undefined, {
      enabled: Boolean(inventoryItemId),
    })

  const itemWithLevels = inventoryItem
    ? {
        ...inventoryItem,
        location_levels:
          inventoryItem.location_levels?.length
            ? inventoryItem.location_levels
            : (inventory_levels ?? []),
      }
    : undefined

  const locationIds = useMemo(() => {
    const fromLevels = itemWithLevels?.location_levels?.map((l) => l.location_id)
    if (fromLevels?.length) {
      return fromLevels
    }
    return reservation?.location_id ? [reservation.location_id] : []
  }, [itemWithLevels, reservation?.location_id])

  const { stock_locations, isPending: isLocationsPending } = useStockLocations(
    { id: locationIds },
    { enabled: locationIds.length > 0 },
  )

  const locationsForForm = useMemo(() => {
    if (stock_locations?.length) {
      return stock_locations
    }
    return (itemWithLevels?.location_levels ?? []).map((level) => {
      const enriched = level as HttpTypes.AdminInventoryLevel & {
        stock_locations?: { name?: string }[]
      }
      return {
        id: level.location_id,
        name: enriched.stock_locations?.[0]?.name ?? level.location_id,
      }
    })
  }, [stock_locations, itemWithLevels])

  const ready =
    !isPending &&
    !isInventoryPending &&
    !isLevelsPending &&
    (!locationIds.length || !isLocationsPending) &&
    reservation &&
    itemWithLevels &&
    locationsForForm.length > 0
  if (isError) {
    throw error
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <Heading>{t("inventory.reservation.editItemDetails")}</Heading>
      </RouteDrawer.Header>
      {ready && (
        <EditReservationForm
          locations={locationsForForm as HttpTypes.AdminStockLocation[]}
          reservation={reservation}
          item={itemWithLevels}
        />
      )}
    </RouteDrawer>
  )
}
