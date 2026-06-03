import { isNull } from "drizzle-orm"
import { getDb, inventoryItem } from "@my-store/db"
import type { AdminGetInventoryItemsParamsType } from "@my-store/validators/admin-list-params"
import { listLimitOffset } from "../lib/query-filters"

export const inventoryService = {
  async listInventoryItems(query: AdminGetInventoryItemsParamsType) {
    const db = getDb()
    const { limit, offset } = listLimitOffset(query, { limit: 50, offset: 0 })
    const items = await db
      .select({
        id: inventoryItem.id,
        title: inventoryItem.title,
        sku: inventoryItem.sku,
        description: inventoryItem.description,
        thumbnail: inventoryItem.thumbnail,
        requires_shipping: inventoryItem.requires_shipping,
        hs_code: inventoryItem.hs_code,
        origin_country: inventoryItem.origin_country,
        metadata: inventoryItem.metadata,
      })
      .from(inventoryItem)
      .where(isNull(inventoryItem.deleted_at))
      .orderBy(inventoryItem.title)
      .limit(limit)
      .offset(offset)

    return { inventory_items: items, count: items.length, limit, offset }
  },
}
