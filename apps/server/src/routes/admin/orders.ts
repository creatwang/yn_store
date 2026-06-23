import { Hono } from "hono"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { existsSync } from "node:fs"
import { zValidator } from "@hono/zod-validator"
import { rpcQueryValidator } from "../../lib/infra/query/rpc-query-validator"
import {
  createOrderSchema,
  updateOrderSchema,
  createFulfillmentSchema,
  cancelFulfillmentSchema,
  createShipmentSchema,
  markAsDeliveredSchema,
  createCreditLineSchema,
  requestTransferSchema,
  addLineItemToOrderSchema,
  addShippingMethodToOrderSchema,
} from "@my-store/validators"
import {
  AdminGetOrdersParams,
  AdminOrderChangesParams,
} from "@my-store/validators/admin-list-params"
import { AdminGetOrderShippingOptionList } from "@my-store/validators/medusa/admin/orders/validators"
import { orderService } from "../../services/order.service"
import { fulfillmentService } from "../../services/fulfillment.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminOrders = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  // 鈹€鈹€ Order CRUD 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  .get("/", rpcQueryValidator(AdminGetOrdersParams), async (c) => {
    const query = c.req.valid("query")
    const result = await orderService.list(query)
    return c.json(result)
  })
  .get("/export/:transactionId", async (c) => {
    const filePath = path.resolve(process.cwd(), "public/exports", `${c.req.param("transactionId")}.csv`)
    if (!existsSync(filePath)) return c.json({ message: "Export not found" }, 404)
    const csv = await readFile(filePath, "utf-8")
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders-${c.req.param("transactionId")}.csv"`,
      },
    })
  })
  .post("/export", async (c) => {
    const result = await orderService.exportOrders()
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const fields = c.req.query("fields")
    const result = await orderService.getById(
      c.req.param("id"),
      false,
      undefined,
      fields,
    )
    return c.json(result)
  })
  .post("/:id/notes", async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const value = typeof body?.value === "string" ? body.value.trim() : ""
    if (!value) {
      return c.json({ message: "澶囨敞鍐呭涓嶈兘涓虹┖" }, 400)
    }
    const result = await orderService.addNote(c.req.param("id"), value)
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
  // 鈹€鈹€ Changes / Preview / Credit Lines / Transfer 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  .get("/:id/changes", rpcQueryValidator(AdminOrderChangesParams), async (c) => {
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
  // 鈹€鈹€ Line Items / Shipping Options 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  .get("/:id/line-items", async (c) => {
    const result = await orderService.listLineItems(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/line-items", zValidator("json", addLineItemToOrderSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await orderService.addLineItem(c.req.param("id"), body)
    return c.json(result, 201)
  })
  .get(
    "/:id/shipping-options",
    rpcQueryValidator(AdminGetOrderShippingOptionList),
    async (c) => {
      const result = await orderService.listShippingOptions(
        c.req.param("id"),
        c.req.valid("query"),
      )
      return c.json(result)
    },
  )
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
  // 鈹€鈹€ Transactions / Delete 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  .get("/:id/transactions", async (c) => {
    const result = await orderService.listTransactions(c.req.param("id"))
    return c.json(result)
  })
  .delete("/:id", async (c) => {
    const result = await orderService.deleteOrder(c.req.param("id"))
    return c.json(result)
  })
  // 鈹€鈹€ Fulfillments 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
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

