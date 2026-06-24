// @ts-nocheck
import { HttpTypes } from "@medusajs/types"
import { Container, createDataTableColumnHelper } from "@medusajs/ui"
import { keepPreviousData } from "@tanstack/react-query"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { PencilSquare } from "@medusajs/icons"
import { DataTable } from "../../../../../components/data-table"
import { useDataTableDateColumns } from "../../../../../components/data-table/helpers/general/use-data-table-date-columns"
import { useDataTableDateFilters } from "../../../../../components/data-table/helpers/general/use-data-table-date-filters"
import { usersQueryKeys, useUsers } from "../../../../../hooks/api/users"
import { useMedusaDataTableBatchDelete } from "../../../../../hooks/table/use-medusa-data-table-batch-delete"
import { useTablePageSize } from "../../../../../hooks/table/table-pagination"
import { useQueryParams } from "../../../../../hooks/use-query-params"
import { sdk } from "../../../../../lib/api/client"
import { queryClient } from "../../../../../lib/query/query-client"

const PAGE_SIZE = 20

export const UserListTable = () => {
  const { q, order, offset } = useQueryParams(["q", "order", "offset"])
  const pageSize = useTablePageSize(undefined, PAGE_SIZE)
  const { users, count, isPending, isError, error } = useUsers(
    {
      q,
      order,
      offset: offset ? parseInt(offset) : 0,
      limit: pageSize,
    },
    {
      placeholderData: keepPreviousData,
    }
  )

  const columns = useColumns()
  const filters = useFilters()

  const batchDelete = useMedusaDataTableBatchDelete({
    deleteFn: (ids) => sdk.admin.user.batchDelete({ ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryKeys.lists() })
    },
  })

  const { t } = useTranslation()

  if (isError) {
    throw error
  }

  return (
    <Container className="divide-y p-0">
      <DataTable
        data={users}
        columns={columns}
        filters={filters}
        getRowId={(row) => row.id}
        rowCount={count}
        pageSize={PAGE_SIZE}
        heading={t("users.domain")}
        rowHref={(row) => `${row.id}`}
        isLoading={isPending}
        action={{
          label: t("users.invite"),
          to: "invite",
        }}
        emptyState={{
          empty: {
            heading: t("users.list.empty.heading"),
            description: t("users.list.empty.description"),
          },
          filtered: {
            heading: t("users.list.filtered.heading"),
            description: t("users.list.filtered.description"),
          },
        }}
        rowSelection={batchDelete.rowSelection}
        commands={batchDelete.commands}
      />
    </Container>
  )
}

const columnHelper = createDataTableColumnHelper<HttpTypes.AdminUser>()

const useColumns = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const dateColumns = useDataTableDateColumns<HttpTypes.AdminUser>()

  return useMemo(
    () => [
      columnHelper.select(),
      columnHelper.accessor("email", {
        header: t("fields.email"),
        cell: ({ row }) => {
          return row.original.email
        },
        enableSorting: true,
        sortAscLabel: t("filters.sorting.alphabeticallyAsc"),
        sortDescLabel: t("filters.sorting.alphabeticallyDesc"),
      }),
      columnHelper.accessor("first_name", {
        header: t("fields.firstName"),
        cell: ({ row }) => {
          return row.original.first_name || "-"
        },
        enableSorting: true,
        sortAscLabel: t("filters.sorting.alphabeticallyAsc"),
        sortDescLabel: t("filters.sorting.alphabeticallyDesc"),
      }),
      columnHelper.accessor("last_name", {
        header: t("fields.lastName"),
        cell: ({ row }) => {
          return row.original.last_name || "-"
        },
        enableSorting: true,
        sortAscLabel: t("filters.sorting.alphabeticallyAsc"),
        sortDescLabel: t("filters.sorting.alphabeticallyDesc"),
      }),
      ...dateColumns,
      columnHelper.action({
        actions: [
          {
            label: t("actions.edit"),
            icon: <PencilSquare />,
            onClick: (ctx) => {
              navigate(`${ctx.row.original.id}/edit`)
            },
          },
        ],
      }),
    ],
    [t, navigate, dateColumns]
  )
}

const useFilters = () => {
  const dateFilters = useDataTableDateFilters()

  return useMemo(() => {
    return dateFilters
  }, [dateFilters])
}
