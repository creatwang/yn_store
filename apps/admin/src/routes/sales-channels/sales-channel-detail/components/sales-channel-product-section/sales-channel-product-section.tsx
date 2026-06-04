// @ts-nocheck
import { PencilSquare, Plus, Trash } from "@medusajs/icons"
import { HttpTypes, SalesChannelDTO } from "@medusajs/types"
import { Checkbox, Container, Heading, toast, usePrompt } from "@medusajs/ui"
import { keepPreviousData } from "@tanstack/react-query"
import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { ActionMenu } from "../../../../../components/common/action-menu"
import { _DataTable } from "../../../../../components/table/data-table"
import { useProducts } from "../../../../../hooks/api/products"
import { useSalesChannelRemoveProducts } from "../../../../../hooks/api/sales-channels"
import { useProductTableColumns } from "../../../../../hooks/table/columns/use-product-table-columns"
import { useProductTableFilters } from "../../../../../hooks/table/filters/use-product-table-filters"
import { useProductTableQuery } from "../../../../../hooks/table/query/use-product-table-query"
import { useDataTable } from "../../../../../hooks/use-data-table"

type SalesChannelProductSectionProps = {
  salesChannel: SalesChannelDTO
}

const PAGE_SIZE = 10

export const SalesChannelProductSection = ({
  salesChannel,
}: SalesChannelProductSectionProps) => {
  const { t } = useTranslation()
  const prompt = usePrompt()

  const { searchParams, raw } = useProductTableQuery({ pageSize: PAGE_SIZE })
  const { products, count, isLoading, isError, error } = useProducts(
    {
      limit: PAGE_SIZE,
      ...searchParams,
      sales_channel_id: [salesChannel.id],
    },
    {
      placeholderData: keepPreviousData,
    },
  )

  const filters = useProductTableFilters(["sales_channel_id"])
  const columns = useColumns()

  const { table } = useDataTable({
    data: products ?? [],
    columns,
    getRowId: (row) => row.id,
    count,
    enablePagination: true,
    enableRowSelection: true,
    pageSize: PAGE_SIZE,
    meta: {
      salesChannelId: salesChannel.id,
    },
  })

  const { mutateAsync } = useSalesChannelRemoveProducts(salesChannel.id)

  const handleRemove = async (selection: Record<string, boolean>) => {
    const ids = Object.keys(selection)

    const result = await prompt({
      title: t("general.areYouSure"),
      description: t("salesChannels.removeProductsWarning", {
        count: ids.length,
        sales_channel: salesChannel.name,
      }),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!result) {
      return
    }

    await mutateAsync(ids, {
      onSuccess: () => {
        toast.success(t("salesChannels.toast.update"))
        table.resetRowSelection()
      },
      onError: (err) => {
        toast.error(err.message)
      },
    })
  }

  if (isError) {
    throw error
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("products.domain")}</Heading>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  icon: <Plus />,
                  label: t("actions.add"),
                  to: "products",
                },
              ],
            },
          ]}
        />
      </div>
      <_DataTable
        table={table}
        columns={columns}
        search
        pagination
        pageSize={PAGE_SIZE}
        navigateTo={({ original }) => `/products/${original.id}`}
        count={count}
        filters={filters}
        isLoading={isLoading}
        orderBy={[
          { key: "title", label: t("fields.title") },
          { key: "status", label: t("fields.status") },
          { key: "created_at", label: t("fields.createdAt") },
          { key: "updated_at", label: t("fields.updatedAt") },
        ]}
        queryObject={raw}
        commands={[
          {
            action: handleRemove,
            label: t("actions.remove"),
            shortcut: "r",
          },
        ]}
        noRecords={{
          message: t("salesChannels.products.list.noRecordsMessage"),
        }}
      />
    </Container>
  )
}

const ProductActions = ({
  product,
  salesChannelId,
}: {
  product: HttpTypes.AdminProduct
  salesChannelId: string
}) => {
  const { t } = useTranslation()
  const { mutateAsync } = useSalesChannelRemoveProducts(salesChannelId)

  const onRemove = async () => {
    await mutateAsync([product.id], {
      onSuccess: () => {
        toast.success(t("salesChannels.toast.update"))
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
              to: `/products/${product.id}`,
            },
          ],
        },
        {
          actions: [
            {
              icon: <Trash />,
              label: t("actions.remove"),
              onClick: onRemove,
            },
          ],
        },
      ]}
    />
  )
}

const columnHelper = createColumnHelper<HttpTypes.AdminProduct>()

const useColumns = () => {
  const columns = useProductTableColumns()

  return useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : table.getIsAllPageRowsSelected()
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            onClick={(e) => {
              e.stopPropagation()
            }}
          />
        ),
      }),
      ...columns,
      columnHelper.display({
        id: "actions",
        cell: ({ row, table }) => {
          const { salesChannelId } = table.options.meta as {
            salesChannelId: string
          }

          return (
            <ProductActions
              product={row.original}
              salesChannelId={salesChannelId}
            />
          )
        },
      }),
    ],
    [columns],
  )
}
