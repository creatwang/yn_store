import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
  AdminAddDraftOrderItems,
  AdminAddDraftOrderPromotions,
  AdminAddDraftOrderShippingMethod,
  AdminCreateDraftOrder,
  AdminGetDraftOrderParams,
  AdminGetDraftOrdersParams,
  AdminRemoveDraftOrderPromotions,
  AdminUpdateDraftOrder,
  AdminUpdateDraftOrderActionItem,
  AdminUpdateDraftOrderActionShippingMethod,
  AdminUpdateDraftOrderItem,
  AdminUpdateDraftOrderShippingMethod,
} from "@my-store/validators/medusa/admin/draft-orders/validators"
import { draftOrderService } from "../../services/draft-order.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminDraftOrders = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", zValidator("query", AdminGetDraftOrdersParams), async (c) => {
    const result = await draftOrderService.list(c.req.valid("query"))
    return c.json(result)
  })
  .post("/", zValidator("json", AdminCreateDraftOrder()), async (c) => {
    const result = await draftOrderService.create(c.req.valid("json"))
    return c.json(result, 201)
  })
  .get(
    "/:id",
    zValidator("query", AdminGetDraftOrderParams),
    async (c) => {
      const result = await draftOrderService.getById(
        c.req.param("id"),
        c.req.valid("query").fields,
      )
      return c.json(result)
    },
  )
  .post("/:id", zValidator("json", AdminUpdateDraftOrder), async (c) => {
    const result = await draftOrderService.update(
      c.req.param("id"),
      c.req.valid("json"),
    )
    return c.json(result)
  })
  .delete("/:id", async (c) => {
    const result = await draftOrderService.delete(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/convert-to-order", async (c) => {
    const result = await draftOrderService.convertToOrder(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/edit", async (c) => {
    const result = await draftOrderService.beginEdit(c.req.param("id"))
    return c.json(result)
  })
  .delete("/:id/edit", async (c) => {
    const result = await draftOrderService.cancelEdit(c.req.param("id"))
    return c.json(result)
  })
  .post(
    "/:id/edit/items",
    zValidator("json", AdminAddDraftOrderItems),
    async (c) => {
      const result = await draftOrderService.addItems(
        c.req.param("id"),
        c.req.valid("json").items,
      )
      return c.json(result)
    },
  )
  .post(
    "/:id/edit/items/item/:itemId",
    zValidator("json", AdminUpdateDraftOrderItem),
    async (c) => {
      const result = await draftOrderService.updateItem(
        c.req.param("id"),
        c.req.param("itemId"),
        c.req.valid("json"),
      )
      return c.json(result)
    },
  )
  .post(
    "/:id/edit/items/:actionId",
    zValidator("json", AdminUpdateDraftOrderActionItem),
    async (c) => {
      const result = await draftOrderService.updateItemAction(
        c.req.param("id"),
        c.req.param("actionId"),
        c.req.valid("json"),
      )
      return c.json(result)
    },
  )
  .delete("/:id/edit/items/:actionId", async (c) => {
    const result = await draftOrderService.removeItemAction(
      c.req.param("id"),
      c.req.param("actionId"),
    )
    return c.json(result)
  })
  .post(
    "/:id/edit/shipping-methods",
    zValidator("json", AdminAddDraftOrderShippingMethod),
    async (c) => {
      const result = await draftOrderService.addShippingMethod(
        c.req.param("id"),
        c.req.valid("json"),
      )
      return c.json(result)
    },
  )
  .post(
    "/:id/edit/shipping-methods/method/:methodId",
    zValidator("json", AdminUpdateDraftOrderShippingMethod),
    async (c) => {
      const result = await draftOrderService.updateShippingMethod(
        c.req.param("id"),
        c.req.param("methodId"),
        c.req.valid("json"),
      )
      return c.json(result)
    },
  )
  .delete("/:id/edit/shipping-methods/method/:methodId", async (c) => {
    const result = await draftOrderService.removeShippingMethod(
      c.req.param("id"),
      c.req.param("methodId"),
    )
    return c.json(result)
  })
  .post(
    "/:id/edit/shipping-methods/:actionId",
    zValidator("json", AdminUpdateDraftOrderActionShippingMethod),
    async (c) => {
      const result = await draftOrderService.updateShippingMethodAction(
        c.req.param("id"),
        c.req.param("actionId"),
        c.req.valid("json"),
      )
      return c.json(result)
    },
  )
  .delete("/:id/edit/shipping-methods/:actionId", async (c) => {
    const result = await draftOrderService.removeShippingMethodAction(
      c.req.param("id"),
      c.req.param("actionId"),
    )
    return c.json(result)
  })
  .post(
    "/:id/edit/promotions",
    zValidator("json", AdminAddDraftOrderPromotions),
    async (c) => {
      const result = await draftOrderService.addPromotions(
        c.req.param("id"),
        c.req.valid("json"),
      )
      return c.json(result)
    },
  )
  .delete(
    "/:id/edit/promotions",
    zValidator("json", AdminRemoveDraftOrderPromotions),
    async (c) => {
      const result = await draftOrderService.removePromotions(
        c.req.param("id"),
        c.req.valid("json"),
      )
      return c.json(result)
    },
  )
  .post("/:id/edit/request", async (c) => {
    const result = await draftOrderService.requestEdit(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/edit/confirm", async (c) => {
    const result = await draftOrderService.confirmEdit(c.req.param("id"))
    return c.json(result)
  })
