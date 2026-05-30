import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { storeService } from "../../services/store.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"
import { updateStoreSchema } from "@my-store/validators"

export const adminStore = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  // 参考: @medusajs/medusa/dist/api/admin/stores/route.js (GET)
  .get("/", async (c) => {
    const result = await storeService.listStores()
    return c.json(result)
  })
  // 参考: @medusajs/medusa/dist/api/admin/stores/[id]/route.js (GET)
  .get("/:id", async (c) => {
    const result = await storeService.getStoreById(c.req.param("id"))
    return c.json(result)
  })
  // 参考: @medusajs/medusa/dist/api/admin/stores/[id]/route.js (POST)
  .post("/:id", zValidator("json", updateStoreSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await storeService.updateStore(c.req.param("id"), body)
    return c.json(result)
  })
