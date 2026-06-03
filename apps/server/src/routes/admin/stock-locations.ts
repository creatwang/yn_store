import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { paginationSchema } from "@my-store/validators"
import { stockLocationService } from "../../services/stock-location.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminStockLocations = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", zValidator("query", paginationSchema), async (c) => {
    const query = c.req.valid("query")
    const result = await stockLocationService.list({
      limit: query.limit,
      offset: query.offset,
    })
    return c.json(result)
  })
