// @ts-nocheck
import { Button, Container, Heading } from "@medusajs/ui"
import { keepPreviousData } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, Outlet } from "react-router-dom"

import { _DataTable } from "../../../../../components/table/data-table/data-table"
import { useDraftOrders } from "../../../../../hooks/api/draft-orders"
import { useOrderTableColumns } from "../../../../../hooks/table/columns/use-order-table-columns"
import { useDraftOrderTableQuery } from "../../../../../hooks/table/query/use-draft-order-table-query"
import { useOrderTableFilters } from "../../../../../hooks/table/filters"
import { useDataTable } from "../../../../../hooks/use-data-table"

const PAGE_SIZE = 20

const DEFAULT_FIELDS =
  "id,status,email,display_id,total,currency_code,*customer,*sales_channel,created_at,updated_at"

export const DraftOrderListTable = () => {
  const { t } = useTranslation()

  const { searchParams, raw } = useDraftOrderTableQuery({
    pageSize: PAGE_SIZE,
  })

  const { draft_orders, count, isError, error, isLoading } = useDraftOrders(
    {
      fields: DEFAULT_FIELDS,
      order: searchParams.order ?? "-created_at",
      ...searchParams,
    },
    {
      placeholderData: keepPreviousData,
    },
  )

  const filters = useOrderTableFilters()
  const columns = useOrderTableColumns({})

  const { table } = useDataTable({
    data: draft_orders ?? [],
    columns,
    enablePagination: true,
    count,
    pageSize: PAGE_SIZE,
  })

  if (isError) {
    throw error
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading>{t("draftOrders.domain")}</Heading>
        <Button size="small" variant="secondary" asChild>
          <Link to="/draft-orders/create">
            {t("draftOrders.create.createDraftOrder")}
          </Link>
        </Button>
      </div>
      <_DataTable
        columns={columns}
        table={table}
        pagination
        navigateTo={(row) => `/draft-orders/${row.original.id}`}
        filters={filters}
        count={count}
        search
        isLoading={isLoading}
        pageSize={PAGE_SIZE}
        orderBy={[
          { key: "display_id", label: t("orders.fields.displayId") },
          { key: "created_at", label: t("fields.createdAt") },
          { key: "updated_at", label: t("fields.updatedAt") },
        ]}
        queryObject={raw}
        noRecords={{
          message: t("draftOrders.list.noRecordsMessage"),
        }}
      />
      <Outlet />
    </Container>
  )
}
