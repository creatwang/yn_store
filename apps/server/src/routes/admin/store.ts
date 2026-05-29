import { Hono } from "hono"
import { storeService } from "../../services/store.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminStore = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => {
    const result = await storeService.listStores()
    return c.json(result)
  })
