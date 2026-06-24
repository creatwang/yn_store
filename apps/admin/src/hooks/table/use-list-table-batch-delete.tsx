// @ts-nocheck
import { toast, usePrompt } from "@medusajs/ui"
import { RowSelectionState } from "@tanstack/react-table"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { useDataTableSelectColumn } from "./columns/use-data-table-select-column"

type BatchDeleteResult = {
  deleted?: string[]
  not_found?: string[]
}

type UseListTableBatchDeleteOptions = {
  deleteFn: (ids: string[]) => Promise<BatchDeleteResult>
  onSuccess?: () => void
  warningKey?: string
  toastPrefix?: string
}

export function useListTableBatchDelete<TData>(
  options: UseListTableBatchDeleteOptions,
) {
  const {
    deleteFn,
    onSuccess,
    warningKey = "general.batchDeleteWarning",
    toastPrefix = "general.batchDelete",
  } = options

  const { t } = useTranslation()
  const prompt = usePrompt()
  const [selection, setSelection] = useState<RowSelectionState>({})

  const selectColumn = useDataTableSelectColumn<TData>()

  const handleBatchDelete = useCallback(
    async (rowSelection: Record<string, boolean>) => {
      const ids = Object.keys(rowSelection)
      if (!ids.length) {
        return
      }

      const res = await prompt({
        title: t("general.areYouSure"),
        description: t(warningKey, { count: ids.length }),
        confirmText: t("actions.delete"),
        cancelText: t("actions.cancel"),
      })

      if (!res) {
        return
      }

      try {
        const result = await deleteFn(ids)
        const deletedCount = result.deleted?.length ?? 0
        const notFoundCount = result.not_found?.length ?? 0

        const parts = []
        if (deletedCount > 0) {
          parts.push(t(`${toastPrefix}.success`, { count: deletedCount }))
        }
        if (notFoundCount > 0) {
          parts.push(t(`${toastPrefix}.notFound`, { count: notFoundCount }))
        }

        toast.success(t(`${toastPrefix}.header`), {
          description: parts.join("，"),
        })

        onSuccess?.()
        setSelection({})
      } catch (e: any) {
        toast.error(t(`${toastPrefix}.error.header`), {
          description: e.message,
        })
      }
    },
    [deleteFn, onSuccess, prompt, t, toastPrefix, warningKey],
  )

  const commands = useMemo(
    () => [
      {
        label: t("actions.delete"),
        shortcut: "d",
        action: handleBatchDelete,
      },
    ],
    [handleBatchDelete, t],
  )

  const rowSelection = useMemo(
    () => ({
      state: selection,
      updater: setSelection,
    }),
    [selection],
  )

  return {
    selectColumn,
    commands,
    rowSelection,
    enableRowSelection: true as const,
    handleBatchDelete,
    setSelection,
  }
}
