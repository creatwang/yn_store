import { Hono } from "hono"
import { rpcQueryValidator } from "../../lib/infra/query/rpc-query-validator"
import { StoreGetProductsParams } from "@my-store/validators/admin-list-params"
import { productService } from "../../services/product.service"
import type { SalesChannelVariables } from "../../middleware/sales-channel"
import type { LocaleVariables } from "../../middleware/locale"

type StoreProductVariables = SalesChannelVariables & LocaleVariables

export const storeProducts = new Hono<{ Variables: StoreProductVariables }>()
  .get("/", rpcQueryValidator(StoreGetProductsParams), async (c) => {
    const query = c.req.valid("query")
    const salesChannelId = c.get("salesChannelId")
    const locale = c.get("locale")
    const result = await productService.listStore(query, salesChannelId, locale)
    return c.json(result)
  })
  .get("/:id/realtime", async (c) => {
    const id = c.req.param("id")
    const result = await productService.getRealtime(id)
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id")
    const locale = c.get("locale")
    if (id.startsWith("prod_")) {
      const result = await productService.getById(id, true, undefined, locale)
      return c.json(result)
    }
    const result = await productService.getByHandle(id, locale)
    return c.json(result)
  })

