import { Hono } from "hono"
import { storeService } from "../../services/store.service"

export const storeCurrencies = new Hono().get("/", async (c) => {
  const result = await storeService.listStoreCurrencies()
  return c.json(result)
})
