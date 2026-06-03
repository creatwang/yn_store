import { Hono } from "hono"
import { optionService } from "../../services/option.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminProductOptions = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/:productId/options", async (c) => {
    const result = await optionService.listOptions(c.req.param("productId"))
    return c.json(result)
  })
  .get("/:productId/options/:optionId", async (c) => {
    const result = await optionService.getOption(c.req.param("productId"), c.req.param("optionId"))
    return c.json(result)
  })
  .post("/:productId/options", async (c) => {
    const body = await c.req.json()
    const result = await optionService.createOption(c.req.param("productId"), body)
    return c.json(result, 201)
  })
  .post("/:productId/options/:optionId", async (c) => {
    const body = await c.req.json()
    const result = await optionService.updateOption(c.req.param("productId"), c.req.param("optionId"), body)
    return c.json(result)
  })
  .delete("/:productId/options/:optionId", async (c) => {
    const result = await optionService.deleteOption(c.req.param("productId"), c.req.param("optionId"))
    return c.json(result)
  })
