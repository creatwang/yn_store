import { Hono } from "hono"
import { rpcQueryValidator } from "../../lib/infra/query/rpc-query-validator"
import {
  AdminGetSalesChannelsParams,
  StoreGetRegionsParams,
} from "@my-store/validators/admin-list-params"
import { regionService } from "../../services/region.service"

export const storeRegions = new Hono()
  .get("/", rpcQueryValidator(StoreGetRegionsParams), async (c) => {
    const query = c.req.valid("query")
    const result = await regionService.listRegions(query)
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await regionService.getRegionById(c.req.param("id"))
    return c.json(result)
  })

export const storeSalesChannels = new Hono()
  .get("/", rpcQueryValidator(AdminGetSalesChannelsParams), async (c) => {
    const query = c.req.valid("query")
    const result = await regionService.listSalesChannels(query)
    return c.json(result)
  })
  .get("/default", async (c) => {
    const result = await regionService.getDefaultSalesChannel()
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await regionService.getSalesChannelById(c.req.param("id"))
    return c.json(result)
  })

