import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
  createProductSchema,
  listProductsSchema,
  updateProductSchema,
} from "@my-store/validators"
import { productService } from "../../services/product.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminProducts = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", zValidator("query", listProductsSchema), async (c) => {
    const query = c.req.valid("query")
    const result = await productService.list(query)
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await productService.getById(c.req.param("id"))
    return c.json(result)
  })
  .post("/", zValidator("json", createProductSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await productService.create(body)
    return c.json(result, 201)
  })
  .post("/:id", zValidator("json", updateProductSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await productService.update(c.req.param("id"), body)
    return c.json(result)
  })
  .delete("/:id", async (c) => {
    const result = await productService.delete(c.req.param("id"))
    return c.json(result)
  })
