import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { rpcQueryValidator } from "../../lib/rpc-query-validator"
import {
  createRegionSchema,
  updateRegionSchema,
} from "@my-store/validators"
import { AdminGetRegionsParams } from "@my-store/validators/admin-list-params"
import { regionService } from "../../services/region.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminRegions = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", rpcQueryValidator(AdminGetRegionsParams), async (c) => {
    const query = c.req.valid("query")
    const result = await regionService.listRegions(query)
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await regionService.getRegionById(c.req.param("id"))
    return c.json(result)
  })
  .post("/", zValidator("json", createRegionSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await regionService.createRegion(body)
    return c.json(result, 201)
  })
  .post("/:id", zValidator("json", updateRegionSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await regionService.updateRegion(c.req.param("id"), body)
    return c.json(result)
  })
  .delete("/:id", async (c) => {
    const result = await regionService.deleteRegion(c.req.param("id"))
    return c.json(result)
  })

