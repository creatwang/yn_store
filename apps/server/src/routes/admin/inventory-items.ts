import { Hono } from "hono"
import { inventoryService } from "../../services/inventory.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminInventoryItems = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => {
    const result = await inventoryService.listInventoryItems()
    return c.json(result)
  })
