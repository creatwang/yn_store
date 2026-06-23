import { Hono } from "hono"
import { rpcQueryValidator } from "../../lib/infra/query/rpc-query-validator"
import { createFindParams } from "@my-store/validators"
import { StoreGetCollectionsParams } from "@my-store/validators/admin-list-params"
import { storeCatalogService } from "../../services/store-catalog.service"
import type { LocaleVariables } from "../../middleware/locale"

const storePromotionsListParams = createFindParams({ limit: 20, offset: 0 })

export const storeCollections = new Hono<{ Variables: LocaleVariables }>()
  .get("/", rpcQueryValidator(StoreGetCollectionsParams), async (c) => {
    const query = c.req.valid("query")
    const locale = c.get("locale")
    const result = await storeCatalogService.listCollections(query, locale)
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const locale = c.get("locale")
    const result = await storeCatalogService.getCollection(c.req.param("id"), locale)
    return c.json(result)
  })

export const storePromotions = new Hono()
  .get("/", rpcQueryValidator(storePromotionsListParams), async (c) => {
    const query = c.req.valid("query")
    const result = await storeCatalogService.listPromotions(query)
    return c.json(result)
  })

