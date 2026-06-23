import { Hono } from "hono"
import { rpcQueryValidator } from "../../lib/infra/query/rpc-query-validator"
import { AdminGetInventoryItemsParams } from "@my-store/validators/admin-list-params"
import { inventoryService } from "../../services/inventory.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminInventoryItems = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", rpcQueryValidator(AdminGetInventoryItemsParams), async (c) => {
    const result = await inventoryService.listInventoryItems(c.req.valid("query"))
    return c.json(result)
  })

