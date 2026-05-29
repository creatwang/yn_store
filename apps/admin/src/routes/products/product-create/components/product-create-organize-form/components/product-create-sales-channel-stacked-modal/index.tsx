// @ts-nocheck
import { HttpTypes } from "@medusajs/types"
import { Button, Checkbox, Text } from "@medusajs/ui"
import { keepPreviousData } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { DataTable } from "../../../../../../../components/data-table"
import * as hooks from "../../../../../../../components/data-table/helpers/sales-channels"
import {
  StackedFocusModal,
  useStackedModal,
} from "../../../../../../../components/modals"
import { useSalesChannels } from "../../../../../../../hooks/api/sales-channels"
import { ProductCreateSchemaType } from "../../../../types"
import { SC_STACKED_MODAL_ID } from "../../constants"

const PAGE_SIZE = 50
const PREFIX = "sc"

type ProductCreateSalesChannelStackedModalProps = {
  form: UseFormReturn<ProductCreateSchemaType>
}

export const ProductCreateSalesChannelStackedModal = ({
  form,
}: ProductCreateSalesChannelStackedModalProps) => {
  const { t } = useTranslation()
  const { setIsOpen } = useStackedModal()

  const { getValues, setValue } = form
  const [selection, setSelection] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const current = getValues("sales_channels") || []
    const map: Record<string, boolean> = {}
    current.forEach((sc) => { map[sc.id] = true })
    setSelection(map)
  }, [getValues])

  const searchParams = hooks.useSalesChannelTableQuery({
    pageSize: PAGE_SIZE,
    prefix: PREFIX,
  })

  const { sales_channels, count, isLoading, isError, error } = useSalesChannels(
    { ...searchParams },
    { placeholderData: keepPreviousData }
  )

  const filters = hooks.useSalesChannelTableFilters()
  const emptyState = hooks.useSalesChannelTableEmptyState()
  const columns = useMemo(() => {
    return [
      {
        id: "name",
        accessorKey: "name",
        header: t("fields.name"),
        cell: ({ row }) => row.original.name,
      },
      {
        id: "description",
        accessorKey: "description",
        header: t("fields.description"),
        cell: ({ row }) => row.original.description,
      },
    ]
  }, [t])

  if (isError) throw error

  const handleSave = () => {
    const channels: { id: string; name: string }[] = []
    Object.keys(selection).forEach((id) => {
      if (selection[id]) {
        const sc = (sales_channels || []).find((s) => s.id === id)
        channels.push({ id, name: sc?.name || id })
      }
    })
    setValue("sales_channels", channels, { shouldDirty: true, shouldValidate: true })
    setIsOpen(SC_STACKED_MODAL_ID, false)
  }

  return (
    <StackedFocusModal.Content>
      <StackedFocusModal.Header />
      <StackedFocusModal.Body className="flex-1 overflow-hidden">
        <DataTable
          data={sales_channels || []}
          columns={columns}
          getRowId={(row: HttpTypes.AdminSalesChannel) => row.id}
          rowCount={count}
          isLoading={isLoading}
          filters={filters}
          rowSelection={{
            state: selection,
            onRowSelectionChange: (updater: any) =>
              setSelection((prev) =>
                typeof updater === "function" ? updater(prev) : updater
              ),
          }}
          autoFocusSearch
          layout="fill"
          emptyState={emptyState}
          prefix={PREFIX}
        />
      </StackedFocusModal.Body>
      <StackedFocusModal.Footer>
        <div className="flex items-center justify-end gap-x-2">
          <StackedFocusModal.Close asChild>
            <Button variant="secondary" size="small">
              {t("actions.cancel")}
            </Button>
          </StackedFocusModal.Close>
          <Button size="small" type="button" onClick={handleSave}>
            {t("actions.save")}
          </Button>
        </div>
      </StackedFocusModal.Footer>
    </StackedFocusModal.Content>
  )
}
