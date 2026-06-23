import { Hono } from "hono"
import { translationService } from "../../services/translation.service"

export const storeLocales = new Hono().get("/", async (c) => {
  const result = await translationService.listStoreLocales()
  return c.json(result)
})
