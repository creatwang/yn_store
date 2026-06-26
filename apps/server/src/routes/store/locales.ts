import { Hono } from "hono"
import { storeService } from "../../services/store.service"

export const storeLocales = new Hono().get("/", async (c) => {
  const result = await storeService.listStoreLocalesForStorefront()
  return c.json(result)
})
