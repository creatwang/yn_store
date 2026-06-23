// @ts-nocheck
import { GlobeEurope, PencilSquare, Tag, Trash } from "@medusajs/icons"
import { Button, Checkbox, Container, Heading, toast, usePrompt } from "@medusajs/ui"
import { keepPreviousData } from "@tanstack/react-query"
import { createColumnHelper } from "@tanstack/react-table"
import { RowSelectionState } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, Outlet, useLoaderData, useLocation } from "react-router-dom"

import { HttpTypes } from "@medusajs/types"
import { ActionMenu } from "../../../../../components/common/action-menu"
import { _DataTable } from "../../../../../components/table/data-table"
import {
  useDeleteProduct,
  useProducts,
} from "../../../../../hooks/api/products"
import { useProductTableColumns } from "../../../../../hooks/table/columns/use-product-table-columns"
import { useProductTableFilters } from "../../../../../hooks/table/filters/use-product-table-filters"
import { useProductTableQuery } from "../../../../../hooks/table/query/use-product-table-query"
import { useDataTable } from "../../../../../hooks/use-data-table"
import { productsLoader } from "../../loader"
import { useFeatureFlag } from "../../../../../providers/feature-flag-provider"
import { sdk } from "../../../../../lib/api/client"
import { queryClient } from "../../../../../lib/query/query-client"
import { productsQueryKeys } from "../../../../../hooks/api/products"

const PAGE_SIZE = 20

export const ProductListTable = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const prompt = usePrompt()

  const initialData = useLoaderData() as Awaited<
    ReturnType<ReturnType<typeof productsLoader>>
  >

  const [selection, setSelection] = useState<RowSelectionState>({})

  const { searchParams, raw } = useProductTableQuery({ pageSize: PAGE_SIZE })
  const { products, count, isLoading, isError, error } = useProducts(
    {
      ...searchParams,
      is_giftcard: false,
    },
    {
      initialData,
      placeholderData: keepPreviousData,
    }
  )

  const filters = useProductTableFilters()
  const columns = useColumns()

  const { table } = useDataTable({
    data: (products ?? []) as HttpTypes.AdminProduct[],
    columns,
    count,
    enablePagination: true,
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
      description: t("products.batchDeleteWarning", { count: ids.length }),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!res) {
      return
    }

    try {
      const result = await sdk.admin.product.batchDelete({ ids })
      const deletedCount = result.deleted?.length ?? 0
      const notFoundCount = result.not_found?.length ?? 0

      const parts = []
      if (deletedCount > 0) {
        parts.push(t("products.toasts.batchDelete.success", { count: deletedCount }))
      }
      if (notFoundCount > 0) {
        parts.push(t("products.toasts.batchDelete.notFound", { count: notFoundCount }))
      }

      toast.success(t("products.toasts.batchDelete.header"), {
        description: parts.join("，"),
      })

      queryClient.invalidateQueries({ queryKey: productsQueryKeys.lists() })
    } catch (e) {
      toast.error(t("products.toasts.batchDelete.error.header"), {
        description: e.message,
      })
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">{t("products.domain")}</Heading>
        <div className="flex items-center justify-center gap-x-2">
          <Button size="small" variant="secondary" asChild>
            <Link to={`export${location.search}`}>{t("actions.export")}</Link>
          </Button>
          <Button size="small" variant="secondary" asChild>
            <Link to={`import${location.search}`}>{t("actions.import")}</Link>
          </Button>
          <Button size="small" variant="secondary" asChild>
            <Link to="create">{t("actions.create")}</Link>
          </Button>
        </div>
      </div>
      <_DataTable
        table={table}
        columns={columns}
        count={count}
        pageSize={PAGE_SIZE}
        filters={filters}
        search
        pagination
        isLoading={isLoading}
        queryObject={raw}
        navigateTo={(row) => `${row.original.id}`}
        orderBy={[
          { key: "title", label: t("fields.title") },
          { key: "created_at", label: t("fields.createdAt") },
          { key: "updated_at", label: t("fields.updatedAt") },
        ]}
        noRecords={{
          message: t("products.list.noRecordsMessage"),
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

const ProductActions = ({ product }: { product: HttpTypes.AdminProduct }) => {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const { mutateAsync } = useDeleteProduct(product.id)
  const isTranslationsEnabled = useFeatureFlag("translation")

  const handleGenerateSkus = async () => {
    try {
      const result = await sdk.admin.product.generateSkus(product.id)
      const generatedCount = result.generated?.length ?? 0
      const skippedCount = result.skipped?.length ?? 0

      if (generatedCount > 0) {
        toast.success(t("products.toasts.generateSkus.success"), {
          description: t("products.toasts.generateSkus.description", {
            generated: generatedCount,
            skipped: skippedCount,
          }),
        })
      } else {
        toast.info(t("products.toasts.generateSkus.noSkusNeeded"))
      }

      queryClient.invalidateQueries({ queryKey: productsQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: productsQueryKeys.detail(product.id) })
    } catch (e) {
      toast.error(t("products.toasts.generateSkus.error"), {
        description: e.message,
      })
    }
  }

  const handleDelete = async () => {
    const res = await prompt({
      title: t("general.areYouSure"),
      description: t("products.deleteWarning", {
        title: product.title,
      }),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!res) {
      return
    }

    await mutateAsync(undefined, {
      onSuccess: () => {
        toast.success(t("products.toasts.delete.success.header"), {
          description: t("products.toasts.delete.success.description", {
            title: product.title,
          }),
        })
      },
      onError: (e) => {
        toast.error(t("products.toasts.delete.error.header"), {
          description: e.message,
        })
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
              to: `/products/${product.id}/edit`,
            },
            {
              icon: <Tag />,
              label: t("products.generateSkus"),
              onClick: handleGenerateSkus,
            },
          ],
        },
        ...(isTranslationsEnabled
          ? [
              {
                actions: [
                  {
                    icon: <GlobeEurope />,
                    label: t("translations.actions.manage"),
                    to: `/settings/translations/edit?reference=product&reference_id=${product.id}`,
                  },
                ],
              },
            ]
          : []),
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

const columnHelper = createColumnHelper<HttpTypes.AdminProduct>()

const useColumns = () => {
  const base = useProductTableColumns()

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: ({ table }) => {
          return (
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
          )
        },
        cell: ({ row }) => {
          return (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              onClick={(e) => {
                e.stopPropagation()
              }}
            />
          )
        },
      }),
      ...base,
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => {
          return <ProductActions product={row.original} />
        },
      }),
    ],
    [base]
  )

  return columns
}
