import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { rpcQueryValidator } from "../../lib/infra/query/rpc-query-validator"
import {
  storeTransferActionSchema,
  storeRequestTransferSchema,
} from "@my-store/validators"
import { StoreGetOrdersParams } from "@my-store/validators/admin-list-params"
import { orderService } from "../../services/order.service"
import { storeAuth, type AuthVariables } from "../../middleware/auth"

export const storeOrders = new Hono<{ Variables: AuthVariables }>()
  .use("*", storeAuth)
  .get("/", rpcQueryValidator(StoreGetOrdersParams), async (c) => {
    const query = c.req.valid("query")
    const customerId = c.get("user").actor_id
    const result = await orderService.listStore(customerId, query)
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id")
    const customerId = c.get("user").actor_id
    const result = await orderService.getById(id, true, customerId)
    return c.json(result)
  })
  // 鈹€鈹€ Transfer 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  .post("/:id/transfer/request", zValidator("json", storeRequestTransferSchema), async (c) => {
    const id = c.req.param("id")
    const customerId = c.get("user").actor_id
    const body = c.req.valid("json")
    const result = await orderService.storeRequestTransfer(id, customerId, body)
    return c.json(result)
  })
  .post("/:id/transfer/accept", zValidator("json", storeTransferActionSchema), async (c) => {
    const id = c.req.param("id")
    const customerId = c.get("user").actor_id
    const result = await orderService.storeAcceptTransfer(id, customerId)
    return c.json(result)
  })
  .post("/:id/transfer/decline", zValidator("json", storeTransferActionSchema), async (c) => {
    const id = c.req.param("id")
    const customerId = c.get("user").actor_id
    const result = await orderService.storeDeclineTransfer(id, customerId)
    return c.json(result)
  })
  .post("/:id/transfer/cancel", zValidator("json", storeTransferActionSchema), async (c) => {
    const id = c.req.param("id")
    const customerId = c.get("user").actor_id
    const result = await orderService.storeCancelTransfer(id, customerId)
    return c.json(result)
  })

