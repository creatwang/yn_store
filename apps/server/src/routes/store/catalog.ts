import { Hono } from "hono"
import { rpcQueryValidator } from "../../lib/rpc-query-validator"
import { createFindParams } from "@my-store/validators"
import { StoreGetCollectionsParams } from "@my-store/validators/admin-list-params"
import { storeCatalogService } from "../../services/store-catalog.service"

const storePromotionsListParams = createFindParams({ limit: 20, offset: 0 })

export const storeCollections = new Hono()
  .get("/", rpcQueryValidator(StoreGetCollectionsParams), async (c) => {
    const query = c.req.valid("query")
    const result = await storeCatalogService.listCollections(query)
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await storeCatalogService.getCollection(c.req.param("id"))
    return c.json(result)
  })

export const storePromotions = new Hono()
  .get("/", rpcQueryValidator(storePromotionsListParams), async (c) => {
    const query = c.req.valid("query")
    const result = await storeCatalogService.listPromotions(query)
    return c.json(result)
  })

