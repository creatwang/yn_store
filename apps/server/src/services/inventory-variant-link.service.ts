import { and, eq, isNull, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  inventoryItem,
  productVariant,
  productVariantInventoryItem,
} from "@my-store/db"

type VariantRow = typeof productVariant.$inferSelect

type InventoryKitInput = {
  inventory_item_id: string
  required_quantity?: number
}

export async function linkInventoryItemToVariant(
  inventoryItemId: string,
  variantId: string,
  requiredQuantity = 1,
) {
  const db = getDb()
  const [existing] = await db
    .select({ id: productVariantInventoryItem.id })
    .from(productVariantInventoryItem)
    .where(
      and(
        eq(productVariantInventoryItem.variant_id, variantId),
        eq(productVariantInventoryItem.inventory_item_id, inventoryItemId),
        isNull(productVariantInventoryItem.deleted_at),
      ),
    )
    .limit(1)

  if (existing) {
    return existing.id
  }

  const linkId = generateId("pvii")
  await db.insert(productVariantInventoryItem).values({
    id: linkId,
    variant_id: variantId,
    inventory_item_id: inventoryItemId,
    required_quantity: requiredQuantity,
    created_at: sql`now()`,
    updated_at: sql`now()`,
  })

  return linkId
}

export async function attachInventoryKitToVariant(
  variantId: string,
  items: InventoryKitInput[],
) {
  const db = getDb()
  await db
    .update(productVariantInventoryItem)
    .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
    .where(
      and(
        eq(productVariantInventoryItem.variant_id, variantId),
        isNull(productVariantInventoryItem.deleted_at),
      ),
    )

  for (const item of items) {
    if (!item.inventory_item_id) continue
    await linkInventoryItemToVariant(
      item.inventory_item_id,
      variantId,
      item.required_quantity ?? 1,
    )
  }
}

/**
 * 对齐 Medusa：manage_inventory=true 且未指定 inventory kit 时，
 * 自动创建默认 inventory_item 并建立 variant 关联。
 */
export async function ensureDefaultInventoryForVariant(variant: VariantRow) {
  if (!variant.manage_inventory) {
    return null
  }

  const db = getDb()
  const [existingLink] = await db
    .select({ inventory_item_id: productVariantInventoryItem.inventory_item_id })
    .from(productVariantInventoryItem)
    .where(
      and(
        eq(productVariantInventoryItem.variant_id, variant.id),
        isNull(productVariantInventoryItem.deleted_at),
      ),
    )
    .limit(1)

  if (existingLink) {
    return existingLink.inventory_item_id
  }

  const itemId = generateId("iitem")
  await db.insert(inventoryItem).values({
    id: itemId,
    sku: variant.sku ?? null,
    title: variant.title ?? null,
    requires_shipping: true,
    weight: variant.weight ?? null,
    length: variant.length ?? null,
    height: variant.height ?? null,
    width: variant.width ?? null,
    origin_country: variant.origin_country ?? null,
    hs_code: variant.hs_code ?? null,
    mid_code: variant.mid_code ?? null,
    material: variant.material ?? null,
    thumbnail: variant.thumbnail ?? null,
    created_at: sql`now()`,
    updated_at: sql`now()`,
  })

  await linkInventoryItemToVariant(itemId, variant.id, 1)
  return itemId
}

export async function syncVariantInventoryFromInput(
  variant: VariantRow,
  input: {
    manage_inventory?: boolean
    inventory_items?: InventoryKitInput[]
  },
) {
  const manageInventory =
    input.manage_inventory !== undefined
      ? Boolean(input.manage_inventory)
      : variant.manage_inventory

  if (!manageInventory) {
    return
  }

  if (input.inventory_items?.length) {
    await attachInventoryKitToVariant(variant.id, input.inventory_items)
    return
  }

  await ensureDefaultInventoryForVariant(variant)
}

/** 历史数据：仅有 SKU 无 link 时，按 SKU 补建关联（幂等） */
export async function repairVariantLinksBySku(
  inventoryItemId: string,
  sku: string | null | undefined,
) {
  if (!sku?.trim()) return

  const db = getDb()
  const variants = await db
    .select()
    .from(productVariant)
    .where(
      and(eq(productVariant.sku, sku.trim()), isNull(productVariant.deleted_at)),
    )

  for (const variant of variants) {
    if (variant.manage_inventory) {
      await linkInventoryItemToVariant(inventoryItemId, variant.id, 1)
    }
  }
}

export async function linkInventoryItemToVariantId(
  inventoryItemId: string,
  variantId: string,
  requiredQuantity = 1,
) {
  const db = getDb()
  const [variant] = await db
    .select()
    .from(productVariant)
    .where(
      and(eq(productVariant.id, variantId), isNull(productVariant.deleted_at)),
    )
    .limit(1)

  if (!variant) {
    return null
  }

  await linkInventoryItemToVariant(
    inventoryItemId,
    variantId,
    requiredQuantity,
  )

  if (variant.manage_inventory) {
    return inventoryItemId
  }

  await db
    .update(productVariant)
    .set({ manage_inventory: true, updated_at: sql`now()` })
    .where(eq(productVariant.id, variantId))

  return inventoryItemId
}
