import { isNull } from "drizzle-orm"
import { getDb, store } from "@my-store/db"

export const storeService = {
  async listStores() {
    const db = getDb()
    const rows = await db
      .select({
        id: store.id,
        name: store.name,
        default_sales_channel_id: store.default_sales_channel_id,
        default_region_id: store.default_region_id,
        default_location_id: store.default_location_id,
      })
      .from(store)
      .where(isNull(store.deleted_at))
      .limit(1)

    return { stores: rows, count: rows.length }
  },
}
