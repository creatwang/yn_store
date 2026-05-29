import { Hono } from "hono"
import { stockLocationService } from "../../services/stock-location.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminStockLocations = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => {
    const result = await stockLocationService.listStockLocations()
    return c.json(result)
  })
