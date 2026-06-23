import { Hono } from "hono"
import { rpcQueryValidator } from "../../lib/infra/query/rpc-query-validator"
import { AdminGetStockLocationsParams } from "@my-store/validators/admin-list-params"
import { stockLocationService } from "../../services/stock-location.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminStockLocations = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", rpcQueryValidator(AdminGetStockLocationsParams), async (c) => {
    const query = c.req.valid("query")
    const result = await stockLocationService.list(query)
    return c.json(result)
  })

