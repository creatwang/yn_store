// @ts-nocheck
import { Filter } from "../../../../../components/table/data-table"
import { useStockLocations } from "../../../../../hooks/api/stock-locations"
import { useTranslation } from "react-i18next"

export const useLocationLevelTableFilters = () => {
  const { t } = useTranslation()
  const { stock_locations } = useStockLocations({ limit: 1000 })

  const filters: Filter[] = []

  if (stock_locations?.length) {
    filters.push({
      type: "select",
      key: "location_id",
      label: t("fields.location"),
      searchable: true,
      options: stock_locations.map((location) => ({
        label: location.name,
        value: location.id,
      })),
    })
  }

  return filters
}
