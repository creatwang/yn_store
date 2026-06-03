import { Hono } from "hono"
import { storeShippingService } from "../../services/store-checkout.service"

export const storeShippingOptions = new Hono()
  .get("/", async (c) => {
    const cartId = c.req.query("cart_id")
    const result = await storeShippingService.listOptions(cartId)
    return c.json(result)
  })
  .post("/:id/calculate", async (c) => {
    const result = await storeShippingService.calculate(c.req.param("id"))
    return c.json(result)
  })
