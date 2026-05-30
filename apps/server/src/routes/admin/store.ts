import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { storeService } from "../../services/store.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"
import { updateStoreSchema } from "@my-store/validators"

export const adminStore = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => {
    const result = await storeService.listStores()
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await storeService.getStoreById(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id", zValidator("json", updateStoreSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await storeService.updateStore(c.req.param("id"), body)
    return c.json(result)
  })
  .get("/:id/currencies", async (c) => {
    const result = await storeService.listCurrencies(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/currencies", async (c) => {
    const body = await c.req.json()
    const result = await storeService.addCurrencies(c.req.param("id"), body)
    return c.json(result)
  })
  .delete("/:id/currencies", async (c) => {
    const body = await c.req.json()
    const result = await storeService.removeCurrencies(c.req.param("id"), body)
    return c.json(result)
  })
