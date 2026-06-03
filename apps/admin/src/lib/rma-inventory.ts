import type { AdminInventoryLevel } from "@medusajs/types"

export function getAvailableAtLocation(
  levels: AdminInventoryLevel[] | undefined,
  locationId: string | undefined,
): number | undefined {
  if (!locationId || !levels?.length) {
    return undefined
  }

  const level = levels.find((l) => l.location_id === locationId)
  if (!level) {
    return 0
  }

  return Number(level.available_quantity ?? 0)
}

export function hasStockAtLocation(
  levels: AdminInventoryLevel[] | undefined,
  locationId: string | undefined,
): boolean {
  const available = getAvailableAtLocation(levels, locationId)
  if (available === undefined) {
    return true
  }
  return available > 0
}

export type OutboundInventoryLine = {
  variant_id?: string | null
  quantity?: number | null
}

export function findOutboundQuantityViolation(
  items: OutboundInventoryLine[],
  inventoryMap: Record<string, AdminInventoryLevel[]>,
  locationId: string | undefined,
  options?: { skipVariant?: (variantId: string) => boolean },
): { variantId: string; available: number; requested: number } | null {
  if (!locationId) {
    return null
  }

  for (const item of items) {
    const variantId = item.variant_id
    if (!variantId) {
      continue
    }
    if (options?.skipVariant?.(variantId)) {
      continue
    }

    const available = getAvailableAtLocation(inventoryMap[variantId], locationId)
    if (available === undefined) {
      continue
    }

    const requested = Number(item.quantity ?? 0)
    if (requested > available) {
      return { variantId, available, requested }
    }
  }

  return null
}

export async function fetchVariantInventoryMap(
  variantIds: string[],
): Promise<Record<string, AdminInventoryLevel[]>> {
  const { sdk } = await import("./client")
  const ret: Record<string, AdminInventoryLevel[]> = {}
  if (!variantIds.length) {
    return ret
  }

  const { variants } = await sdk.admin.productVariant.list({
    id: variantIds,
    fields: "*inventory.location_levels",
  })

  for (const variant of variants ?? []) {
    const levels =
      (variant as { inventory?: { location_levels?: AdminInventoryLevel[] }[] })
        .inventory?.[0]?.location_levels ?? []
    ret[variant.id] = levels
  }

  return ret
}
