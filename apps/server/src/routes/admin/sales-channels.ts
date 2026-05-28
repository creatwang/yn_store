import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
  createSalesChannelSchema,
  listSalesChannelsSchema,
  updateSalesChannelSchema,
} from "@my-store/validators"
import { regionService } from "../../services/region.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminSalesChannels = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", zValidator("query", listSalesChannelsSchema), async (c) => {
    const query = c.req.valid("query")
    const result = await regionService.listSalesChannels(query)
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await regionService.getSalesChannelById(c.req.param("id"))
    return c.json(result)
  })
  .post("/", zValidator("json", createSalesChannelSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await regionService.createSalesChannel(body)
    return c.json(result, 201)
  })
  .post("/:id", zValidator("json", updateSalesChannelSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await regionService.updateSalesChannel(c.req.param("id"), body)
    return c.json(result)
  })
  .delete("/:id", async (c) => {
    const result = await regionService.deleteSalesChannel(c.req.param("id"))
    return c.json(result)
  })
