// @ts-nocheck
import { PencilSquare, Trash } from "@medusajs/icons"
import { AdminCampaign } from "@medusajs/types"
import { Button, Container, Heading, toast, usePrompt } from "@medusajs/ui"
import { keepPreviousData } from "@tanstack/react-query"
import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { ActionMenu } from "../../../../components/common/action-menu"
import { _DataTable } from "../../../../components/table/data-table"
import {
  campaignsQueryKeys,
  useCampaigns,
  useDeleteCampaign,
} from "../../../../hooks/api/campaigns"
import { useCampaignTableColumns } from "../../../../hooks/table/columns/use-campaign-table-columns"
import { useCampaignTableQuery } from "../../../../hooks/table/query/use-campaign-table-query"
import { useListTableBatchDelete } from "../../../../hooks/table/use-list-table-batch-delete"
import { useDataTable } from "../../../../hooks/use-data-table"
import { sdk } from "../../../../lib/api/client"
import { queryClient } from "../../../../lib/query/query-client"

const PAGE_SIZE = 20

export const CampaignListTable = () => {
  const { t } = useTranslation()
  const { raw, searchParams } = useCampaignTableQuery({ pageSize: PAGE_SIZE })

  const {
    campaigns,
    count,
    isPending: isLoading,
    isError,
    error,
  } = useCampaigns(searchParams, {
    placeholderData: keepPreviousData,
  })

  const batchDelete = useListTableBatchDelete<AdminCampaign>({
    deleteFn: (ids) => sdk.admin.campaign.batchDelete({ ids }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: campaignsQueryKeys.lists() }),
  })

  const columns = useColumns(batchDelete.selectColumn)

  const { table } = useDataTable({
    data: campaigns ?? [],
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
        <Heading level="h1">{t("campaigns.domain")}</Heading>
        <Link to="/campaigns/create">
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
        pagination
        search
        navigateTo={(row) => row.id}
        isLoading={isLoading}
        queryObject={raw}
        orderBy={[
          { key: "name", label: t("fields.name") },
          { key: "created_at", label: t("fields.createdAt") },
          { key: "updated_at", label: t("fields.updatedAt") },
        ]}
        commands={batchDelete.commands}
      />
    </Container>
  )
}

const CampaignActions = ({ campaign }: { campaign: AdminCampaign }) => {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const { mutateAsync } = useDeleteCampaign(campaign.id)

  const handleDelete = async () => {
    const confirm = await prompt({
      title: t("general.areYouSure"),
      description: t("campaigns.deleteCampaignWarning", {
        name: campaign.name,
      }),
      verificationInstruction: t("general.typeToConfirm"),
      verificationText: campaign.name,
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!confirm) {
      return
    }

    await mutateAsync(undefined, {
      onSuccess: () => {
        toast.success(
          t("campaigns.delete.successToast", { name: campaign.name })
        )
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
              icon: <PencilSquare />,
              label: t("actions.edit"),
              to: `/campaigns/${campaign.id}/edit`,
            },
          ],
        },
        {
          actions: [
            {
              icon: <Trash />,
              label: t("actions.delete"),
              onClick: handleDelete,
            },
          ],
        },
      ]}
    />
  )
}

const columnHelper = createColumnHelper<AdminCampaign>()

const useColumns = (selectColumn) => {
  const base = useCampaignTableColumns()

  return useMemo(
    () => [
      selectColumn,
      ...base,
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => {
          return <CampaignActions campaign={row.original} />
        },
      }),
    ],
    [base, selectColumn]
  )
}
