import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { listRegionsSchema, listSalesChannelsSchema } from "@my-store/validators"
import { regionService } from "../../services/region.service"

export const storeRegions = new Hono()
  .get("/", zValidator("query", listRegionsSchema), async (c) => {
    const query = c.req.valid("query")
    const result = await regionService.listRegions(query)
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await regionService.getRegionById(c.req.param("id"))
    return c.json(result)
  })

export const storeSalesChannels = new Hono()
  .get("/", zValidator("query", listSalesChannelsSchema), async (c) => {
    const query = c.req.valid("query")
    const result = await regionService.listSalesChannels(query)
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await regionService.getSalesChannelById(c.req.param("id"))
    return c.json(result)
  })
