import { and, eq, inArray, isNull } from "drizzle-orm"
import {
  getDb,
  inventoryItem,
  inventoryLevel,
  product,
  productOption,
  productOptionValue,
  productVariant,
  productVariantInventoryItem,
  productVariantOption,
  stockLocation,
} from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import { repairVariantLinksBySku } from "./inventory-variant-link.service"

function toNumber(value: string | number | null | undefined) {
  if (value == null) return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export async function loadInventoryLevelsForItem(inventoryItemId: string) {
  const db = getDb()
  const levels = await db
    .select()
    .from(inventoryLevel)
    .where(eq(inventoryLevel.inventory_item_id, inventoryItemId))

  if (!levels.length) return []

  const locationIds = [...new Set(levels.map((l) => l.location_id))]
  const locations = await db
    .select({ id: stockLocation.id, name: stockLocation.name })
    .from(stockLocation)
    .where(
      and(
        inArray(stockLocation.id, locationIds),
        isNull(stockLocation.deleted_at),
      ),
    )
  const locMap = new Map(locations.map((l) => [l.id, l]))

  return levels
    .filter((level) => Boolean(level.location_id?.trim()))
    .map((level) => {
      const loc = locMap.get(level.location_id)
      const stocked_quantity = toNumber(level.stocked_quantity)
      const reserved_quantity = toNumber(level.reserved_quantity)
      const locationName =
        loc?.name?.trim() ||
        (loc ? level.location_id : `（库位不可用: ${level.location_id}）`)
      return {
        ...level,
        stocked_quantity,
        reserved_quantity,
        incoming_quantity: toNumber(level.incoming_quantity),
        available_quantity: stocked_quantity - reserved_quantity,
        stock_locations: [{ id: level.location_id, name: locationName }],
      }
    })
}

export async function loadVariantsForInventoryItem(
  inventoryItemId: string,
  sku?: string | null,
) {
  const db = getDb()

  const loadLinks = () =>
    db
      .select()
      .from(productVariantInventoryItem)
      .where(
        and(
          eq(productVariantInventoryItem.inventory_item_id, inventoryItemId),
          isNull(productVariantInventoryItem.deleted_at),
        ),
      )

  let links = await loadLinks()

  if (!links.length) {
    let itemSku = sku
    if (itemSku == null) {
      const [item] = await db
        .select({ sku: inventoryItem.sku })
        .from(inventoryItem)
        .where(eq(inventoryItem.id, inventoryItemId))
        .limit(1)
      itemSku = item?.sku
    }
    await repairVariantLinksBySku(inventoryItemId, itemSku)
    links = await loadLinks()
  }

  if (!links.length) return []

  const variantIds = links.map((l) => l.variant_id)
  const variants = await db
    .select()
    .from(productVariant)
    .where(
      and(
        inArray(productVariant.id, variantIds),
        isNull(productVariant.deleted_at),
      ),
    )

  const productIds = [...new Set(variants.map((v) => v.product_id))]
  const products =
    productIds.length > 0
      ? await db
          .select()
          .from(product)
          .where(
            and(inArray(product.id, productIds), isNull(product.deleted_at)),
          )
      : []
  const productMap = new Map(products.map((p) => [p.id, p]))

  const optionRows = await db
    .select({
      variant_id: productVariantOption.variant_id,
      value: productOptionValue.value,
      option_id: productOptionValue.option_id,
      option_title: productOption.title,
    })
    .from(productVariantOption)
    .innerJoin(
      productOptionValue,
      eq(productVariantOption.option_value_id, productOptionValue.id),
    )
    .innerJoin(
      productOption,
      eq(productOptionValue.option_id, productOption.id),
    )
    .where(inArray(productVariantOption.variant_id, variantIds))

  const optionsByVariant = new Map<
    string,
    Array<{ value: string; option_id: string; option?: { title: string } }>
  >()
  for (const row of optionRows) {
    const list = optionsByVariant.get(row.variant_id) ?? []
    list.push({
      value: row.value,
      option_id: row.option_id,
      option: { title: row.option_title },
    })
    optionsByVariant.set(row.variant_id, list)
  }

  return variants.map((variant) => ({
    ...variant,
    product: productMap.get(variant.product_id) ?? undefined,
    options: optionsByVariant.get(variant.id) ?? [],
  }))
}

export async function getInventoryItemDetail(id: string) {
  const db = getDb()
  const [item] = await db
    .select()
    .from(inventoryItem)
    .where(and(eq(inventoryItem.id, id), isNull(inventoryItem.deleted_at)))
    .limit(1)

  if (!item) {
    throw new HTTPException(404, { message: "未找到" })
  }

  const location_levels = await loadInventoryLevelsForItem(id)
  const variants = await loadVariantsForInventoryItem(id, item.sku)
  const stocked_quantity = location_levels.reduce(
    (acc, l) => acc + toNumber(l.stocked_quantity),
    0,
  )
  const reserved_quantity = location_levels.reduce(
    (acc, l) => acc + toNumber(l.reserved_quantity),
    0,
  )

  return {
    inventory_item: {
      ...item,
      location_levels,
      variants,
      stocked_quantity,
      reserved_quantity,
    },
  }
}

export async function enrichInventoryItemsForList(
  rows: (typeof inventoryItem.$inferSelect)[],
) {
  if (!rows.length) return rows

  const db = getDb()
  const ids = rows.map((r) => r.id)
  const levels = await db
    .select()
    .from(inventoryLevel)
    .where(inArray(inventoryLevel.inventory_item_id, ids))

  const byItem = new Map<string, (typeof inventoryLevel.$inferSelect)[]>()
  for (const level of levels) {
    const list = byItem.get(level.inventory_item_id) ?? []
    list.push(level)
    byItem.set(level.inventory_item_id, list)
  }

  return rows.map((row) => {
    const itemLevels = byItem.get(row.id) ?? []
    return {
      ...row,
      stocked_quantity: itemLevels.reduce(
        (acc, l) => acc + toNumber(l.stocked_quantity),
        0,
      ),
      reserved_quantity: itemLevels.reduce(
        (acc, l) => acc + toNumber(l.reserved_quantity),
        0,
      ),
    }
  })
}
