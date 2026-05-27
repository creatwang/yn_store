import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { listStoreProductsSchema } from "@my-store/validators"
import { productService } from "../../services/product.service"

export const storeProducts = new Hono()
  .get("/", zValidator("query", listStoreProductsSchema), async (c) => {
    const query = c.req.valid("query")
    const result = await productService.listStore(query)
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
