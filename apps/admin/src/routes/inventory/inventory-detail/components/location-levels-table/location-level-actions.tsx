// @ts-nocheck
import { PencilSquare, Trash } from "@medusajs/icons"
import { AdminInventoryLevel } from "@medusajs/types"
import { toast, usePrompt } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { ActionMenu } from "../../../../../components/common/action-menu"
import {
  inventoryItemLevelsQueryKeys,
  inventoryItemsQueryKeys,
} from "../../../../../hooks/api"
import { sdk } from "../../../../../lib/api/client"
import { queryClient } from "../../../../../lib/query/query-client"

type LocationLevelActionsProps = {
  level: AdminInventoryLevel
}

export const LocationLevelActions = ({ level }: LocationLevelActionsProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const prompt = usePrompt()

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: t("general.areYouSure"),
      description: t("inventory.deleteWarning"),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!confirmed) {
      return
    }

    try {
      await sdk.admin.inventoryItem.deleteLevel(
        level.inventory_item_id,
        level.location_id,
      )
      toast.success(t("inventory.levelDeleted"))
      queryClient.invalidateQueries({
        queryKey: inventoryItemsQueryKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: inventoryItemLevelsQueryKeys.list({
          inventoryItemId: level.inventory_item_id,
        }),
      })
      queryClient.invalidateQueries({
        queryKey: inventoryItemsQueryKeys.detail(level.inventory_item_id),
      })
      queryClient.invalidateQueries({
        queryKey: inventoryItemLevelsQueryKeys.detail(level.inventory_item_id),
      })
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t("errorBoundary.defaultTitle"),
      )
    }
  }

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              icon: <PencilSquare />,
              label: t("actions.edit"),
              onClick: () => navigate(`locations/${level.location_id}`),
            },
          ],
        },
        {
          actions: [
            {
              icon: <Trash />,
              label: t("actions.delete"),
              onClick: handleDelete,
              disabled:
                level.reserved_quantity > 0 || level.stocked_quantity > 0,
            },
          ],
        },
      ]}
    />
  )
}
