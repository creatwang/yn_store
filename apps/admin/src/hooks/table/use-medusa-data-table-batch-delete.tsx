// @ts-nocheck
import {
  DataTableCommand,
  DataTableRowSelectionState,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

type BatchDeleteResult = {
  deleted?: string[]
  not_found?: string[]
}

type UseMedusaDataTableBatchDeleteOptions = {
  deleteFn: (ids: string[]) => Promise<BatchDeleteResult>
  onSuccess?: () => void
  warningKey?: string
  toastPrefix?: string
}

export function useMedusaDataTableBatchDelete(
  options: UseMedusaDataTableBatchDeleteOptions,
) {
  const {
    deleteFn,
    onSuccess,
    warningKey = "general.batchDeleteWarning",
    toastPrefix = "general.batchDelete",
  } = options

  const { t } = useTranslation()
  const prompt = usePrompt()
  const [selection, setSelection] = useState<DataTableRowSelectionState>({})

  const handleBatchDelete = useCallback(
    async (rowSelection: DataTableRowSelectionState) => {
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

  const commands = useMemo<DataTableCommand[]>(
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
      onRowSelectionChange: setSelection,
    }),
    [selection],
  )

  return {
    commands,
    rowSelection,
    setSelection,
  }
}
