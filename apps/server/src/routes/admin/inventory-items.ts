import { Hono } from "hono"
import { sql } from "drizzle-orm"
import { getDb } from "@my-store/db"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminInventoryItems = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => {
    const db = getDb()
    const items = await db.execute(sql`
      SELECT id, title, sku, description, thumbnail, requires_shipping, hs_code, origin_country, metadata
      FROM inventory_item
      WHERE deleted_at IS NULL
      ORDER BY title ASC
    `).then((r: any) => r.rows ?? [])
    return c.json({ inventory_items: items, count: items.length })
  })
