import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { storeCatalogService } from "../../services/store-catalog.service"

const listQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

export const storeCollections = new Hono()
  .get("/", zValidator("query", listQuerySchema), async (c) => {
    const query = c.req.valid("query")
    const result = await storeCatalogService.listCollections(query)
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await storeCatalogService.getCollection(c.req.param("id"))
    return c.json(result)
  })

export const storePromotions = new Hono()
  .get("/", zValidator("query", listQuerySchema), async (c) => {
    const query = c.req.valid("query")
    const result = await storeCatalogService.listPromotions(query)
    return c.json(result)
  })
