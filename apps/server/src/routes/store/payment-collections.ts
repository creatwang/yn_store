import { Hono } from "hono"
import { storePaymentService } from "../../services/store-checkout.service"

export const storePaymentCollections = new Hono()
  .post("/", async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const result = await storePaymentService.createCollection(body)
    return c.json(result, 201)
  })
  .post("/:id/payment-sessions", async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const result = await storePaymentService.createSession(c.req.param("id"), body)
    return c.json(result, 201)
  })
  .post("/:id/payment-sessions/:sessionId/authorize", async (c) => {
    const result = await storePaymentService.authorizeManualSession(
      c.req.param("id"),
      c.req.param("sessionId"),
    )
    return c.json(result)
  })

export const storePaymentProviders = new Hono().get("/", async (c) => {
  const result = await storePaymentService.listProviders()
  return c.json(result)
})
