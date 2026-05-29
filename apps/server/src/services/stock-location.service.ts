import { isNull } from "drizzle-orm"
import { getDb, stockLocation } from "@my-store/db"

export const stockLocationService = {
  async listStockLocations() {
    const db = getDb()
    const locations = await db
      .select({
        id: stockLocation.id,
        name: stockLocation.name,
        metadata: stockLocation.metadata,
        created_at: stockLocation.created_at,
        updated_at: stockLocation.updated_at,
      })
      .from(stockLocation)
      .where(isNull(stockLocation.deleted_at))
      .orderBy(stockLocation.name)

    return { stock_locations: locations, count: locations.length }
  },
}
