import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
  listPaymentsSchema,
  capturePaymentSchema,
  refundPaymentSchema,
} from "@my-store/validators"
import { paymentService } from "../../services/payment.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminPayments = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", zValidator("query", listPaymentsSchema), async (c) => {
    const query = c.req.valid("query")
    const result = await paymentService.listPayments(query)
    return c.json(result)
  })
  .post("/:id/capture", zValidator("json", capturePaymentSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await paymentService.capture(c.req.param("id"), body)
    return c.json(result)
  })
  .post("/:id/refund", zValidator("json", refundPaymentSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await paymentService.refund(c.req.param("id"), body)
    return c.json(result)
  })
