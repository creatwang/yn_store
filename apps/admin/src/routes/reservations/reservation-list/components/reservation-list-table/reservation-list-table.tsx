// @ts-nocheck
import { Button, Container, Heading, Text } from "@medusajs/ui"

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { _DataTable } from "../../../../../components/table/data-table"
import {
  reservationItemsQueryKeys,
  useReservationItems,
} from "../../../../../hooks/api/reservations"
import { useListTableBatchDelete } from "../../../../../hooks/table/use-list-table-batch-delete"
import { useDataTable } from "../../../../../hooks/use-data-table"
import { sdk } from "../../../../../lib/api/client"
import { queryClient } from "../../../../../lib/query/query-client"
import { useReservationTableColumns } from "./use-reservation-table-columns"
import { useReservationTableFilters } from "./use-reservation-table-filters"
import { useReservationTableQuery } from "./use-reservation-table-query"

const PAGE_SIZE = 20

export const ReservationListTable = () => {
  const { t } = useTranslation()

  const { searchParams } = useReservationTableQuery({
    pageSize: PAGE_SIZE,
  })
  const { reservations, count, isPending, isError, error } =
    useReservationItems({
      ...searchParams,
    })

  const batchDelete = useListTableBatchDelete({
    deleteFn: (ids) => sdk.admin.reservation.batchDelete({ ids }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: reservationItemsQueryKeys.lists(),
      }),
  })

  const filters = useReservationTableFilters()
  const columns = useColumns(batchDelete.selectColumn)

  const { table } = useDataTable({
    data: reservations || [],
    columns,
    count,
    enablePagination: true,
    getRowId: (row) => row.id,
    pageSize: PAGE_SIZE,
    enableRowSelection: batchDelete.enableRowSelection,
    rowSelection: batchDelete.rowSelection,
  })

  if (isError) {
    throw error
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("reservations.domain")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("reservations.subtitle")}
          </Text>
        </div>
        <Button variant="secondary" size="small" asChild>
          <Link to="create">{t("actions.create")}</Link>
        </Button>
      </div>
      <_DataTable
        table={table}
        columns={columns}
        pageSize={PAGE_SIZE}
        count={count}
        isLoading={isPending}
        filters={filters}
        pagination
        navigateTo={(row) => row.id}
        search={false}
        commands={batchDelete.commands}
      />
    </Container>
  )
}

const useColumns = (selectColumn) => {
  const base = useReservationTableColumns()

  return useMemo(() => [selectColumn, ...base], [base, selectColumn])
}
