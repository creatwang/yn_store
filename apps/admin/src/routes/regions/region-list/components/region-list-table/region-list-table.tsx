// @ts-nocheck
import { PencilSquare, Trash } from "@medusajs/icons"
import type { HttpTypes } from "@medusajs/types"
import {
  Button,
  Container,
  Heading,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { keepPreviousData } from "@tanstack/react-query"
import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { ActionMenu } from "../../../../../components/common/action-menu"
import { _DataTable } from "../../../../../components/table/data-table"
import {
  regionsQueryKeys,
  useDeleteRegion,
  useRegions,
} from "../../../../../hooks/api/regions"
import { useRegionTableColumns } from "../../../../../hooks/table/columns/use-region-table-columns"
import { useRegionTableFilters } from "../../../../../hooks/table/filters/use-region-table-filters"
import { useRegionTableQuery } from "../../../../../hooks/table/query/use-region-table-query"
import { useListTableBatchDelete } from "../../../../../hooks/table/use-list-table-batch-delete"
import { useDataTable } from "../../../../../hooks/use-data-table"
import { sdk } from "../../../../../lib/api/client"
import { queryClient } from "../../../../../lib/query/query-client"

const PAGE_SIZE = 20

export const RegionListTable = () => {
  const { t } = useTranslation()

  const { searchParams, raw } = useRegionTableQuery({ pageSize: PAGE_SIZE })
  const {
    regions,
    count,
    isPending: isLoading,
    isError,
    error,
  } = useRegions(
    {
      ...searchParams,
      fields: "*payment_providers",
    },
    {
      placeholderData: keepPreviousData,
    }
  )

  const batchDelete = useListTableBatchDelete<HttpTypes.AdminRegion>({
    deleteFn: (ids) => sdk.admin.region.batchDelete({ ids }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: regionsQueryKeys.lists() })
      void queryClient.refetchQueries({
        queryKey: regionsQueryKeys.lists(),
        type: "active",
      })
    },
  })

  const filters = useRegionTableFilters()
  const columns = useColumns(batchDelete.selectColumn)

  const { table } = useDataTable({
    data: (regions ?? []) as HttpTypes.AdminRegion[],
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
          <Heading>{t("regions.domain")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("regions.subtitle")}
          </Text>
        </div>
        <Link to="/settings/regions/create">
          <Button size="small" variant="secondary">
            {t("actions.create")}
          </Button>
        </Link>
      </div>

      <_DataTable
        table={table}
        columns={columns}
        count={count}
        pageSize={PAGE_SIZE}
        isLoading={isLoading}
        filters={filters}
        orderBy={[
          { key: "name", label: t("fields.name") },
          { key: "created_at", label: t("fields.createdAt") },
          { key: "updated_at", label: t("fields.updatedAt") },
        ]}
        navigateTo={(row) => `${row.original.id}`}
        pagination
        search
        queryObject={raw}
        noRecords={{
          message: t("regions.list.noRecordsMessage"),
        }}
        commands={batchDelete.commands}
      />
    </Container>
  )
}

const RegionActions = ({ region }: { region: HttpTypes.AdminRegion }) => {
  const { t } = useTranslation()
  const prompt = usePrompt()

  const { mutateAsync } = useDeleteRegion(region.id)

  const handleDelete = async () => {
    const res = await prompt({
      title: t("general.areYouSure"),
      description: t("regions.deleteRegionWarning", {
        name: region.name,
      }),
      verificationText: region.name,
      verificationInstruction: t("general.typeToConfirm"),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!res) {
      return
    }

    await mutateAsync(undefined, {
      onSuccess: () => {
        toast.success(t("regions.toast.delete"))
      },
      onError: (e) => {
        toast.error(e.message)
      },
    })
  }

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              label: t("actions.edit"),
              to: `/settings/regions/${region.id}/edit`,
              icon: <PencilSquare />,
            },
          ],
        },
        {
          actions: [
            {
              label: t("actions.delete"),
              onClick: handleDelete,
              icon: <Trash />,
            },
          ],
        },
      ]}
    />
  )
}

const columnHelper = createColumnHelper<HttpTypes.AdminRegion>()

const useColumns = (selectColumn) => {
  const base = useRegionTableColumns()

  return useMemo(
    () => [
      selectColumn,
      ...base,
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => {
          return <RegionActions region={row.original} />
        },
      }),
    ],
    [base, selectColumn]
  )
}
