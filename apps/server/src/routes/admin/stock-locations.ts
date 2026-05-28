import { Hono } from "hono"
import { isNull, sql } from "drizzle-orm"
import { getDb, generateId } from "@my-store/db"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminStockLocations = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => {
    const db = getDb()
    const locations = await db.execute(sql`
      SELECT id, name, metadata, created_at, updated_at
      FROM stock_location
      WHERE deleted_at IS NULL
      ORDER BY name ASC
    `).then((r: any) => r.rows ?? [])
    return c.json({ stock_locations: locations, count: locations.length })
  })
