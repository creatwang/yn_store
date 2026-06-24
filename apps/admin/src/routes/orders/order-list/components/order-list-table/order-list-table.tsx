// @ts-nocheck
import { Button, Container, Heading, toast, usePrompt } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"
import { keepPreviousData } from "@tanstack/react-query"
import { RowSelectionState } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, Outlet, useLocation } from "react-router-dom"

import { _DataTable } from "../../../../../components/table/data-table/data-table"
import { ordersQueryKeys, useOrders } from "../../../../../hooks/api/orders"
import { useDataTableSelectColumn } from "../../../../../hooks/table/columns/use-data-table-select-column"
import { useOrderTableColumns } from "../../../../../hooks/table/columns/use-order-table-columns"
import { useOrderTableQuery } from "../../../../../hooks/table/query/use-order-table-query"
import { useDataTable } from "../../../../../hooks/use-data-table"
import { sdk } from "../../../../../lib/api/client"
import { queryClient } from "../../../../../lib/query/query-client"

import { DEFAULT_FIELDS } from "../../const"
import { useOrderTableFilters } from "../../../../../hooks/table/filters"

const PAGE_SIZE = 20

export const OrderListTable = () => {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const location = useLocation()
  const [selection, setSelection] = useState<RowSelectionState>({})

  const { searchParams, raw } = useOrderTableQuery({
    pageSize: PAGE_SIZE,
  })

  const { orders, count, isError, error, isLoading } = useOrders(
    {
      fields: DEFAULT_FIELDS,
      ...searchParams,
    },
    {
      placeholderData: keepPreviousData,
    }
  )

  const filters = useOrderTableFilters()
  const columns = useColumns()

  const { table } = useDataTable({
    data: orders ?? [],
    columns,
    enablePagination: true,
    count,
    pageSize: PAGE_SIZE,
    getRowId: (row) => row.id,
    enableRowSelection: true,
    rowSelection: {
      state: selection,
      updater: setSelection,
    },
  })

  if (isError) {
    throw error
  }

  const handleBatchDelete = async (rowSelection: Record<string, boolean>) => {
    const ids = Object.keys(rowSelection)
    const res = await prompt({
      title: t("general.areYouSure"),
      description: t("orders.batchDeleteWarning", { count: ids.length }),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!res) {
      return
    }

    try {
      const result = await sdk.admin.order.batchDelete({ ids })
      const deletedCount = result.deleted?.length ?? 0
      const notFoundCount = result.not_found?.length ?? 0

      const parts = []
      if (deletedCount > 0) {
        parts.push(t("orders.toasts.batchDelete.success", { count: deletedCount }))
      }
      if (notFoundCount > 0) {
        parts.push(t("orders.toasts.batchDelete.notFound", { count: notFoundCount }))
      }

      toast.success(t("orders.toasts.batchDelete.header"), {
        description: parts.join("，"),
      })

      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.lists() })
      setSelection({})
    } catch (e) {
      toast.error(t("orders.toasts.batchDelete.error.header"), {
        description: e.message,
      })
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading>{t("orders.domain")}</Heading>
        <div className="flex gap-2">
          <Button size="small" variant="secondary" asChild>
            <Link to="/draft-orders/create">
              {t("draftOrders.create.createDraftOrder")}
            </Link>
          </Button>
          <Button size="small" variant="secondary" asChild>
            <Link to={`export${location.search}`}>{t("actions.export")}</Link>
          </Button>
        </div>
      </div>
      <_DataTable
        columns={columns}
        table={table}
        pagination
        navigateTo={(row) => `/orders/${row.original.id}`}
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
          message: t("orders.list.noRecordsMessage"),
        }}
        commands={[
          {
            label: t("actions.delete"),
            shortcut: "d",
            action: handleBatchDelete,
          },
        ]}
      />
      <Outlet />
    </Container>
  )
}

const useColumns = () => {
  const base = useOrderTableColumns({})
  const selectColumn = useDataTableSelectColumn<HttpTypes.AdminOrder>()

  return useMemo(() => [selectColumn, ...base], [base, selectColumn])
}
