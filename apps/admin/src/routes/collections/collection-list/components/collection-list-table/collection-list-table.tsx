// @ts-nocheck
import { Button, Container, Heading, Text, toast, usePrompt } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { HttpTypes } from "@medusajs/types"
import { keepPreviousData } from "@tanstack/react-query"
import { createColumnHelper } from "@tanstack/react-table"
import { RowSelectionState } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { _DataTable } from "../../../../../components/table/data-table"
import { collectionsQueryKeys, useCollections } from "../../../../../hooks/api/collections"
import { useCollectionTableColumns } from "../../../../../hooks/table/columns/use-collection-table-columns"
import { useDataTableSelectColumn } from "../../../../../hooks/table/columns/use-data-table-select-column"
import { useCollectionTableFilters } from "../../../../../hooks/table/filters"
import { useCollectionTableQuery } from "../../../../../hooks/table/query"
import { useDataTable } from "../../../../../hooks/use-data-table"
import { sdk } from "../../../../../lib/api/client"
import { queryClient } from "../../../../../lib/query/query-client"
import { productsQueryKeys } from "../../../../../hooks/api/products"
import { CollectionRowActions } from "./collection-row-actions"

const PAGE_SIZE = 20

export const CollectionListTable = () => {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const [selection, setSelection] = useState<RowSelectionState>({})
  const { searchParams, raw } = useCollectionTableQuery({ pageSize: PAGE_SIZE })
  const { collections, count, isError, error, isLoading } = useCollections(
    {
      ...searchParams,
      fields: "+products.id",
    },
    {
      placeholderData: keepPreviousData,
    }
  )

  const filters = useCollectionTableFilters()
  const columns = useColumns()

  const { table } = useDataTable({
    data: collections ?? [],
    columns,
    count,
    enablePagination: true,
    getRowId: (row, index) => row.id ?? `${index}`,
    pageSize: PAGE_SIZE,
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
      description: t("collections.batchDeleteWarning", { count: ids.length }),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!res) {
      return
    }

    try {
      const result = await sdk.admin.productCollection.batchDelete({ ids })
      const deletedCount = result.deleted?.length ?? 0
      const notFoundCount = result.not_found?.length ?? 0

      const parts = []
      if (deletedCount > 0) {
        parts.push(t("collections.toasts.batchDelete.success", { count: deletedCount }))
      }
      if (notFoundCount > 0) {
        parts.push(t("collections.toasts.batchDelete.notFound", { count: notFoundCount }))
      }

      toast.success(t("collections.toasts.batchDelete.header"), {
        description: parts.join("，"),
      })

      queryClient.invalidateQueries({ queryKey: collectionsQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: productsQueryKeys.lists() })
      setSelection({})
    } catch (e) {
      toast.error(t("collections.toasts.batchDelete.error.header"), {
        description: e.message,
      })
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("collections.domain")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("collections.subtitle")}
          </Text>
        </div>
        <Link to="/collections/create">
          <Button size="small" variant="secondary">
            {t("actions.create")}
          </Button>
        </Link>
      </div>
      <_DataTable
        table={table}
        columns={columns}
        pageSize={PAGE_SIZE}
        count={count}
        filters={filters}
        orderBy={[
          { key: "title", label: t("fields.title") },
          { key: "handle", label: t("fields.handle") },
          { key: "created_at", label: t("fields.createdAt") },
          { key: "updated_at", label: t("fields.updatedAt") },
        ]}
        search
        pagination
        navigateTo={(row) => `/collections/${row.original.id}`}
        queryObject={raw}
        isLoading={isLoading}
        commands={[
          {
            label: t("actions.delete"),
            shortcut: "d",
            action: handleBatchDelete,
          },
        ]}
      />
    </Container>
  )
}

const columnHelper = createColumnHelper<HttpTypes.AdminCollection>()

const useColumns = () => {
  const base = useCollectionTableColumns()
  const selectColumn = useDataTableSelectColumn<HttpTypes.AdminCollection>()

  return useMemo(
    () => [
      selectColumn,
      ...base,
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => <CollectionRowActions collection={row.original} />,
      }),
    ],
    [base, selectColumn]
  )
}
