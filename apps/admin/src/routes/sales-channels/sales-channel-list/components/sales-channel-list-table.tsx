// @ts-nocheck
import { PencilSquare, Trash } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import {
  Container,
  createDataTableColumnHelper,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { keepPreviousData } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { DataTable } from "../../../../components/data-table"
import * as hooks from "../../../../components/data-table/helpers/sales-channels"
import { useStore } from "../../../../hooks/api"
import {
  salesChannelsQueryKeys,
  useDeleteSalesChannelLazy,
  useSalesChannels,
} from "../../../../hooks/api/sales-channels"
import { useMedusaDataTableBatchDelete } from "../../../../hooks/table/use-medusa-data-table-batch-delete"
import { sdk } from "../../../../lib/api/client"
import { queryClient } from "../../../../lib/query/query-client"

type SalesChannelWithIsDefault = HttpTypes.AdminSalesChannel & {
  is_default?: boolean
}

const PAGE_SIZE = 20

export const SalesChannelListTable = () => {
  const { t } = useTranslation()

  const { store } = useStore()

  const searchParams = hooks.useSalesChannelTableQuery({
    pageSize: PAGE_SIZE,
  })

  const { sales_channels, count, isPending, isError, error } = useSalesChannels(
    searchParams,
    {
      placeholderData: keepPreviousData,
    }
  )

  const columns = useColumns()
  const filters = hooks.useSalesChannelTableFilters()
  const emptyState = hooks.useSalesChannelTableEmptyState()

  const batchDelete = useMedusaDataTableBatchDelete({
    deleteFn: (ids) => sdk.admin.salesChannel.batchDelete({ ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: salesChannelsQueryKeys.lists(),
      })
    },
  })

  const sales_channels_data: SalesChannelWithIsDefault[] =
    sales_channels?.map((sales_channel) => {
      return {
        ...sales_channel,
        is_default: store?.default_sales_channel_id === sales_channel.id,
      }
    }) ?? []

  if (isError) {
    throw error
  }

  return (
    <Container className="p-0">
      <DataTable
        data={sales_channels_data}
        columns={columns}
        rowCount={count}
        getRowId={(row) => row.id}
        pageSize={PAGE_SIZE}
        filters={filters}
        isLoading={isPending}
        emptyState={emptyState}
        heading={t("salesChannels.domain")}
        subHeading={t("salesChannels.subtitle")}
        action={{
          label: t("actions.create"),
          to: "/settings/sales-channels/create",
        }}
        rowHref={(row) => `/settings/sales-channels/${row.id}`}
        rowSelection={batchDelete.rowSelection}
        commands={batchDelete.commands}
      />
    </Container>
  )
}

const columnHelper = createDataTableColumnHelper<
  HttpTypes.AdminSalesChannel & { is_default?: boolean }
>()

const useColumns = () => {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const navigate = useNavigate()
  const base = hooks.useSalesChannelTableColumns()

  const { mutateAsync } = useDeleteSalesChannelLazy()

  const handleDelete = useCallback(
    async (salesChannel: HttpTypes.AdminSalesChannel) => {
      const confirm = await prompt({
        title: t("general.areYouSure"),
        description: t("salesChannels.deleteSalesChannelWarning", {
          name: salesChannel.name,
        }),
        verificationInstruction: t("general.typeToConfirm"),
        verificationText: salesChannel.name,
        confirmText: t("actions.delete"),
        cancelText: t("actions.cancel"),
      })

      if (!confirm) {
        return
      }

      await mutateAsync(salesChannel.id, {
        onSuccess: () => {
          toast.success(t("salesChannels.toast.delete"))
        },
        onError: (e) => {
          toast.error(e.message)
        },
      })
    },
    [t, prompt, mutateAsync]
  )

  return useMemo(
    () => [
      columnHelper.select(),
      ...base,
      columnHelper.action({
        actions: (ctx) => {
          const disabledTooltip = ctx.row.original.is_default
            ? t("salesChannels.tooltip.cannotDeleteDefault")
            : undefined

          return [
            [
              {
                icon: <PencilSquare />,
                label: t("actions.edit"),
                onClick: () =>
                  navigate(
                    `/settings/sales-channels/${ctx.row.original.id}/edit`
                  ),
              },
            ],
            [
              {
                icon: <Trash />,
                label: t("actions.delete"),
                onClick: () => handleDelete(ctx.row.original),
                disabled: ctx.row.original.is_default,
                disabledTooltip,
              },
            ],
          ]
        },
      }),
    ],
    [base, handleDelete, navigate, t]
  )
}
