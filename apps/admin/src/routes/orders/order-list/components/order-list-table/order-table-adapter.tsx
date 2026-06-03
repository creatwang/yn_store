// @ts-nocheck
import { HttpTypes } from "@medusajs/types"
import {
  createTableAdapter,
  TableAdapter,
} from "../../../../../lib/table/table-adapters"
import { useOrders } from "../../../../../hooks/api/orders"
import { orderColumnAdapter } from "../../../../../lib/table/entity-adapters"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useRegions, useSalesChannels } from "../../../../../hooks/api"
import { createDataTableFilterHelper, DataTableFilter } from "@medusajs/ui"
import { useDataTableDateFilters } from "../../../../../components/data-table/helpers/general/use-data-table-date-filters"

/**
 * Create the order table adapter with all order-specific logic
 */
export function createOrderTableAdapter(): TableAdapter<HttpTypes.AdminOrder> {
  return createTableAdapter<HttpTypes.AdminOrder>({
    entity: "orders",
    queryPrefix: "o",
    pageSize: 20,
    columnAdapter: orderColumnAdapter,

    useData: (fields, params) => {
      const { orders, count, isError, error, isLoading } = useOrders(
        {
          fields,
          ...params,
        },
        {
          placeholderData: (previousData, previousQuery) => {
            // Only keep placeholder data if the fields haven't changed
            const prevFields =
              // @ts-ignore not sure what the expected type here is
              previousQuery?.[previousQuery?.length - 1]?.query?.fields
            if (prevFields && prevFields !== fields) {
              // Fields changed, don't use placeholder data
              return undefined
            }
            // Fields are the same, keep previous data for smooth transitions
            return previousData
          },
        }
      )

      return {
        data: orders,
        count,
        isLoading,
        isError,
        error,
      }
    },

    getRowHref: (row) => `/orders/${row.id}`,

    emptyState: {
      empty: {
        heading: "No orders found",
      },
    },
  })
}

const filterHelper = createDataTableFilterHelper<HttpTypes.AdminOrder>()

const useOrderTableFilters = () => {
  const { t } = useTranslation()
  const dateFilters = useDataTableDateFilters()

  const { regions } = useRegions({
    limit: 1000,
    fields: "id,name",
  })

  const { sales_channels } = useSalesChannels({
    limit: 1000,
    fields: "id,name",
  })

  // Until we migrate to the new DataTable component, we can't use `createDataTableFilterHelper` filter structure, since the identifier there is `id`
  // while the deprecated component expects `key`. Will be ready to migrate once SUP-2651 is done
  return useMemo(() => {
    const filters: DataTableFilter[] = [
      filterHelper.accessor("total", {
        label: t("fields.total"),
        type: "number",
      }),
      ...dateFilters,
    ]

    if (regions?.length) {
      filters.push(
        filterHelper.accessor("region_id", {
          label: t("fields.region"),
          type: "multiselect",
          searchable: true,
          options: regions.map((r) => ({
            label: r.name,
            value: r.id,
          })),
        })
      )
    }

    if (sales_channels?.length) {
      filters.push(
        filterHelper.accessor("sales_channel_id", {
          label: t("fields.salesChannel"),
          type: "multiselect",
          searchable: true,
          options: sales_channels.map((s) => ({
            label: s.name,
            value: s.id,
          })),
        })
      )
    }

    filters.push(
      filterHelper.accessor("payment_status", {
        label: t("orders.payment.statusLabel"),
        type: "multiselect",
        options: [
          { label: t("orders.payment.status.notPaid"), value: "not_paid" },
          { label: t("orders.payment.status.awaiting"), value: "awaiting" },
          { label: t("orders.payment.status.captured"), value: "captured" },
          { label: t("orders.payment.status.refunded"), value: "refunded" },
          {
            label: t("orders.payment.status.partiallyRefunded"),
            value: "partially_refunded",
          },
          { label: t("orders.payment.status.canceled"), value: "canceled" },
          {
            label: t("orders.payment.status.requiresAction"),
            value: "requires_action",
          },
        ],
      }),
      filterHelper.accessor("fulfillment_status", {
        label: t("orders.fulfillment.statusLabel"),
        type: "multiselect",
        options: [
          {
            label: t("orders.fulfillment.status.notFulfilled"),
            value: "not_fulfilled",
          },
          {
            label: t("orders.fulfillment.status.fulfilled"),
            value: "fulfilled",
          },
          {
            label: t("orders.fulfillment.status.partiallyFulfilled"),
            value: "partially_fulfilled",
          },
          {
            label: t("orders.fulfillment.status.returned"),
            value: "returned",
          },
          {
            label: t("orders.fulfillment.status.partiallyReturned"),
            value: "partially_returned",
          },
          {
            label: t("orders.fulfillment.status.shipped"),
            value: "shipped",
          },
          {
            label: t("orders.fulfillment.status.partiallyShipped"),
            value: "partially_shipped",
          },
          {
            label: t("orders.fulfillment.status.canceled"),
            value: "canceled",
          },
          {
            label: t("orders.fulfillment.status.requiresAction"),
            value: "requires_action",
          },
        ],
      }),
    )

    return filters
  }, [regions, sales_channels, dateFilters, t])
}

/**
 * Hook to get the order table adapter with filters
 */
export function useOrderTableAdapter(): TableAdapter<HttpTypes.AdminOrder> {
  const filters = useOrderTableFilters()
  const adapter = createOrderTableAdapter()

  // Add dynamic filters to the adapter
  return {
    ...adapter,
    filters,
    queryPrefix: "o",
  }
}
