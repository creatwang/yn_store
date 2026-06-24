import { Hono } from "hono"
import { rpcQueryValidator } from "../../lib/infra/query/rpc-query-validator"
import { StoreGetProductsParams } from "@my-store/validators/admin-list-params"
import { productService } from "../../services/product.service"
import type { SalesChannelVariables } from "../../middleware/sales-channel"
import type { LocaleVariables } from "../../middleware/locale"
import type { CurrencyVariables } from "../../middleware/currency"

type StoreProductVariables = SalesChannelVariables & LocaleVariables & CurrencyVariables

export const storeProducts = new Hono<{ Variables: StoreProductVariables }>()
  .get("/", rpcQueryValidator(StoreGetProductsParams), async (c) => {
    const query = c.req.valid("query")
    const salesChannelId = c.get("salesChannelId")
    const locale = c.get("locale")
    const currency = c.get("currency")
    const result = await productService.listStore(query, salesChannelId, locale, currency)
    return c.json(result)
  })
  .get("/:id/realtime", async (c) => {
    const id = c.req.param("id")
    const currency = c.get("currency")
    const result = await productService.getRealtime(id, currency)
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id")
    const locale = c.get("locale")
    const currency = c.get("currency")
    if (id.startsWith("prod_")) {
      const result = await productService.getById(id, true, undefined, locale)
      return c.json(result)
    }
    const result = await productService.getByHandle(id, locale, currency)
    return c.json(result)
  })

