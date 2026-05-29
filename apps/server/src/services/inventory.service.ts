import { isNull } from "drizzle-orm"
import { getDb, inventoryItem } from "@my-store/db"

export const inventoryService = {
  async listInventoryItems() {
    const db = getDb()
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

    return { inventory_items: items, count: items.length }
  },
}
