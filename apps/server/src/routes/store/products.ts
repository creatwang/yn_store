import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { rpcQueryValidator } from "../../lib/rpc-query-validator"
import { StoreGetProductsParams } from "@my-store/validators/admin-list-params"
import { productService } from "../../services/product.service"

export const storeProducts = new Hono()
  .get("/", rpcQueryValidator(StoreGetProductsParams), async (c) => {
    const query = c.req.valid("query")
    const result = await productService.listStore(query)
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

