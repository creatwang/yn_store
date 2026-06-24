// @ts-nocheck
import { HttpTypes } from "@medusajs/types"
import { Button, Container, Heading, Text } from "@medusajs/ui"
import { keepPreviousData } from "@tanstack/react-query"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { _DataTable } from "../../../../../components/table/data-table"
import {
  priceListsQueryKeys,
  usePriceLists,
} from "../../../../../hooks/api/price-lists"
import { useListTableBatchDelete } from "../../../../../hooks/table/use-list-table-batch-delete"
import { useDataTable } from "../../../../../hooks/use-data-table"
import { sdk } from "../../../../../lib/api/client"
import { queryClient } from "../../../../../lib/query/query-client"
import { usePricingTableColumns } from "./use-pricing-table-columns"
import { usePricingTableFilters } from "./use-pricing-table-filters"
import { usePricingTableQuery } from "./use-pricing-table-query"

const PAGE_SIZE = 20

export const PriceListListTable = () => {
  const { t } = useTranslation()

  const { searchParams, raw } = usePricingTableQuery({
    pageSize: PAGE_SIZE,
  })
  const { price_lists, count, isLoading, isError, error } = usePriceLists(
    searchParams,
    {
      placeholderData: keepPreviousData,
    }
  )

  const batchDelete = useListTableBatchDelete<HttpTypes.AdminPriceList>({
    deleteFn: (ids) => sdk.admin.priceList.batchDelete({ ids }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: priceListsQueryKeys.lists() }),
  })

  const filters = usePricingTableFilters()
  const columns = useColumns(batchDelete.selectColumn)

  const { table } = useDataTable({
    data: price_lists || [],
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
          <Heading>{t("priceLists.domain")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("priceLists.subtitle")}
          </Text>
        </div>
        <Button size="small" variant="secondary" asChild>
          <Link to="create">{t("actions.create")}</Link>
        </Button>
      </div>
      <_DataTable
        table={table}
        columns={columns}
        count={count}
        filters={filters}
        orderBy={[
          { key: "title", label: t("fields.title") },
          { key: "status", label: t("fields.status") },
          { key: "created_at", label: t("fields.createdAt") },
          { key: "updated_at", label: t("fields.updatedAt") },
        ]}
        queryObject={raw}
        pageSize={PAGE_SIZE}
        navigateTo={(row) => row.original.id}
        isLoading={isLoading}
        pagination
        search
        commands={batchDelete.commands}
      />
    </Container>
  )
}

const useColumns = (selectColumn) => {
  const base = usePricingTableColumns()

  return useMemo(() => [selectColumn, ...base], [base, selectColumn])
}
