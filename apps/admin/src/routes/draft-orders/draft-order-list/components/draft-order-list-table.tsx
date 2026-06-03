// @ts-nocheck
import { Button, Container, Heading, Text } from "@medusajs/ui"
import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { _DataTable } from "../../../../components/table/data-table"
import { useDraftOrders } from "../../../../hooks/api/draft-orders"
import { useDataTable } from "../../../../hooks/use-data-table"

const PAGE_SIZE = 20

type DraftOrderRow = {
  id: string
  display_id?: number | null
  email?: string | null
  status?: string | null
  currency_code?: string | null
  created_at?: string | null
}

const columnHelper = createColumnHelper<DraftOrderRow>()

export const DraftOrderListTable = () => {
  const { t } = useTranslation()

  const { draft_orders, count, isLoading, isError, error } = useDraftOrders({
    limit: PAGE_SIZE,
    offset: 0,
  })

  const columns = useMemo(
    () => [
      columnHelper.accessor("display_id", {
        header: t("fields.displayId"),
        cell: ({ getValue }) => getValue() ?? "—",
      }),
      columnHelper.accessor("email", {
        header: t("fields.email"),
        cell: ({ getValue }) => getValue() ?? "—",
      }),
      columnHelper.accessor("status", {
        header: t("fields.status"),
        cell: ({ getValue }) => getValue() ?? "—",
      }),
      columnHelper.accessor("currency_code", {
        header: t("fields.currency"),
        cell: ({ getValue }) => getValue() ?? "—",
      }),
      columnHelper.accessor("created_at", {
        header: t("fields.createdAt"),
        cell: ({ getValue }) =>
          getValue() ? new Date(getValue() as string).toLocaleString() : "—",
      }),
    ],
    [t]
  )

  const { table } = useDataTable({
    data: (draft_orders ?? []) as DraftOrderRow[],
    columns,
    enablePagination: true,
    count: count ?? draft_orders?.length ?? 0,
    pageSize: PAGE_SIZE,
  })

  if (isError) {
    throw error
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("draftOrders.domain")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("draftOrders.list.description")}
          </Text>
        </div>
        <Link to="/draft-orders/create">
          <Button size="small" variant="secondary">
            {t("draftOrders.create.createDraftOrder")}
          </Button>
        </Link>
      </div>
      <_DataTable
        table={table}
        columns={columns}
        pagination
        navigateTo={(row) => `/draft-orders/${row.original.id}`}
        count={count ?? draft_orders?.length ?? 0}
        isLoading={isLoading}
        pageSize={PAGE_SIZE}
        noRecords={{
          message: t("draftOrders.list.noRecordsMessage"),
        }}
      />
    </Container>
  )
}
