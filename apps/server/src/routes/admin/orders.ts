import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
  createOrderSchema,
  listOrdersSchema,
  updateOrderSchema,
  createFulfillmentSchema,
  cancelFulfillmentSchema,
  createShipmentSchema,
  markAsDeliveredSchema,
  createCreditLineSchema,
  requestTransferSchema,
  listOrderChangesSchema,
  addLineItemToOrderSchema,
  addShippingMethodToOrderSchema,
} from "@my-store/validators"
import { orderService } from "../../services/order.service"
import { fulfillmentService } from "../../services/fulfillment.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminOrders = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  // ── Order CRUD ──────────────────────────────────────────
  .get("/", zValidator("query", listOrdersSchema), async (c) => {
    const query = c.req.valid("query")
    const result = await orderService.list(query)
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await orderService.getById(c.req.param("id"))
    return c.json(result)
  })
  .post("/", zValidator("json", createOrderSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await orderService.create(body)
    return c.json(result, 201)
  })
  .post("/:id", zValidator("json", updateOrderSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await orderService.update(c.req.param("id"), body)
    return c.json(result)
  })
  .post("/:id/cancel", async (c) => {
    const result = await orderService.cancel(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/archive", async (c) => {
    const result = await orderService.archive(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/complete", async (c) => {
    const result = await orderService.complete(c.req.param("id"))
    return c.json(result)
  })
  // ── Changes / Preview / Credit Lines / Transfer ─────────
  .get("/:id/changes", zValidator("query", listOrderChangesSchema), async (c) => {
    const query = c.req.valid("query")
    const result = await orderService.getChanges(c.req.param("id"), query)
    return c.json(result)
  })
  .post("/:id/changes", async (c) => {
    const result = await orderService.createChange(c.req.param("id"))
    return c.json(result, 201)
  })
  .get("/:id/preview", async (c) => {
    const result = await orderService.getPreview(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/credit-lines", zValidator("json", createCreditLineSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await orderService.createCreditLine(c.req.param("id"), body)
    return c.json(result, 201)
  })
  .post("/:id/transfer", zValidator("json", requestTransferSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await orderService.requestTransfer(c.req.param("id"), body)
    return c.json(result)
  })
  .post("/:id/transfer/cancel", async (c) => {
    const result = await orderService.cancelTransfer(c.req.param("id"))
    return c.json(result)
  })
  // ── Line Items / Shipping Options ──────────────────────
  .get("/:id/line-items", async (c) => {
    const result = await orderService.listLineItems(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/line-items", zValidator("json", addLineItemToOrderSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await orderService.addLineItem(c.req.param("id"), body)
    return c.json(result, 201)
  })
  .get("/:id/shipping-options", async (c) => {
    const result = await orderService.listShippingOptions(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/shipping-options", zValidator("json", addShippingMethodToOrderSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await orderService.addShippingMethod(c.req.param("id"), body)
    return c.json(result, 201)
  })
  .delete("/:id/shipping-options/:methodId", async (c) => {
    const { id, methodId } = c.req.param()
    const result = await orderService.removeShippingMethod(id, methodId)
    return c.json(result)
  })
  // ── Transactions / Delete ──────────────────────────────
  .get("/:id/transactions", async (c) => {
    const result = await orderService.listTransactions(c.req.param("id"))
    return c.json(result)
  })
  .delete("/:id", async (c) => {
    const result = await orderService.deleteOrder(c.req.param("id"))
    return c.json(result)
  })
  // ── Fulfillments ────────────────────────────────────────
  .get("/:id/fulfillments", async (c) => {
    const result = await fulfillmentService.listByOrder(c.req.param("id"))
    return c.json(result)
  })
  .get("/:id/fulfillments/:fulfillmentId", async (c) => {
    const result = await fulfillmentService.getById(c.req.param("fulfillmentId"))
    return c.json(result)
  })
  .post("/:id/fulfillments", zValidator("json", createFulfillmentSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await fulfillmentService.create(c.req.param("id"), body)
    return c.json(result, 201)
  })
  .post("/:id/fulfillments/:fulfillmentId/cancel", zValidator("json", cancelFulfillmentSchema), async (c) => {
    const { id, fulfillmentId } = c.req.param()
    const body = c.req.valid("json")
    const result = await fulfillmentService.cancel(id, fulfillmentId, body)
    return c.json(result)
  })
  .post("/:id/fulfillments/:fulfillmentId/shipments", zValidator("json", createShipmentSchema), async (c) => {
    const { id, fulfillmentId } = c.req.param()
    const body = c.req.valid("json")
    const result = await fulfillmentService.createShipment(id, fulfillmentId, body)
    return c.json(result, 201)
  })
  .post("/:id/fulfillments/:fulfillmentId/mark-as-delivered", zValidator("json", markAsDeliveredSchema), async (c) => {
    const { id, fulfillmentId } = c.req.param()
    const body = c.req.valid("json")
    const result = await fulfillmentService.markAsDelivered(id, fulfillmentId, body)
    return c.json(result)
  })
  // ── Export ─────────────────────────────────────────────
  .post("/export", async (c) => {
    const result = await orderService.list({ limit: 9999, offset: 0 })
    return c.json(result)
  })
