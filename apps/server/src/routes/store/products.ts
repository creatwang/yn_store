import { Hono } from "hono"
import { rpcQueryValidator } from "../../lib/rpc-query-validator"
import { StoreGetProductsParams } from "@my-store/validators/admin-list-params"
import { productService } from "../../services/product.service"
import type { SalesChannelVariables } from "../../middleware/sales-channel"

export const storeProducts = new Hono<{ Variables: SalesChannelVariables }>()
  .get("/", rpcQueryValidator(StoreGetProductsParams), async (c) => {
    const query = c.req.valid("query")
    const salesChannelId = c.get("salesChannelId")
    const result = await productService.listStore(query, salesChannelId)
    return c.json(result)
  })
  .get("/:id/realtime", async (c) => {
    const id = c.req.param("id")
    const result = await productService.getRealtime(id)
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id")
    if (id.startsWith("prod_")) {
      const result = await productService.getById(id, true)
      return c.json(result)
    }
    const result = await productService.getByHandle(id)
    return c.json(result)
  })

