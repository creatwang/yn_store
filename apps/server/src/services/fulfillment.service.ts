import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  fulfillment,
  fulfillmentItem,
  fulfillmentLabel,
  order,
  orderItem,
  orderLineItem,
} from "@my-store/db"
import type {
  CreateFulfillmentInput,
  ListFulfillmentsQuery,
  CancelFulfillmentInput,
  CreateShipmentInput,
  MarkAsDeliveredInput,
} from "@my-store/validators"
import { HTTPException } from "hono/http-exception"
import { sendFulfillmentCreatedEmail, sendShipmentEmail, sendOrderDeliveredEmail } from "../lib/mail"
import { notificationService } from "./notification.service"
import { eventBus } from "../lib/events"
import { fulfillmentCreateWorkflow } from "../workflows/fulfillment-create"
import { fulfillmentShipWorkflow } from "../workflows/fulfillment-ship"
import { runInTransaction } from "../lib/transaction"

export const fulfillmentService = {
  async listByOrder(orderId: string, query: ListFulfillmentsQuery = { limit: 50, offset: 0 }) {
    const db = getDb()

    // Find fulfillments through the chain: order_item → fulfillment_item → fulfillment
    const rows = await db
      .selectDistinct({ fulfillmentId: fulfillment.id })
      .from(fulfillment)
      .innerJoin(fulfillmentItem, eq(fulfillment.id, fulfillmentItem.fulfillment_id))
      .innerJoin(orderItem, eq(fulfillmentItem.line_item_id, orderItem.item_id))
      .where(and(
        eq(orderItem.order_id, orderId),
        isNull(fulfillment.canceled_at),
      ))

    const fIds = rows.map((r) => r.fulfillmentId)

    if (fIds.length === 0) {
      return { fulfillments: [] }
    }

    const fulfillments = await db
      .select()
      .from(fulfillment)
      .where(and(
        inArray(fulfillment.id, fIds),
        isNull(fulfillment.canceled_at),
      ))
      .orderBy(desc(fulfillment.created_at))
      .limit(query.limit)
      .offset(query.offset)

    return { fulfillments }
  },

  async getById(id: string) {
    const db = getDb()
    const [item] = await db
      .select()
      .from(fulfillment)
      .where(and(eq(fulfillment.id, id), isNull(fulfillment.canceled_at)))
      .limit(1)

    if (!item) {
      throw new HTTPException(404, { message: "Fulfillment not found" })
    }

    const items = await db
      .select()
      .from(fulfillmentItem)
      .where(eq(fulfillmentItem.fulfillment_id, id))

    const labels = await db
      .select()
      .from(fulfillmentLabel)
      .where(eq(fulfillmentLabel.fulfillment_id, id))

    return { fulfillment: { ...item, items, labels } }
  },

  async create(orderId: string, input: CreateFulfillmentInput) {
    const result = await fulfillmentCreateWorkflow.run({
      order_id: orderId, location_id: input.location_id ?? undefined,
      items: input.items, shipping_option_id: input.shipping_option_id,
      tracking_numbers: input.tracking_numbers, tracking_url: input.tracking_url,
      metadata: input.metadata ?? undefined, no_notification: input.no_notification,
    });
    return this.getById(
      String((result as { fulfillmentId?: string })?.fulfillmentId ?? ""),
    )
  },

  async cancel(orderId: string, fulfillmentId: string, input?: CancelFulfillmentInput) {
    const db = getDb()

    const [f] = await db
      .select()
      .from(fulfillment)
      .where(and(eq(fulfillment.id, fulfillmentId), isNull(fulfillment.canceled_at)))
      .limit(1)

    if (!f) {
      throw new HTTPException(404, { message: "Fulfillment not found or already canceled" })
    }

    if (f.shipped_at) {
      throw new HTTPException(400, { message: "Cannot cancel a fulfillment that has already been shipped" })
    }

    await runInTransaction(async (tx) => {
      await tx
        .update(fulfillment)
        .set({
          canceled_at: sql`now()`,
          data: f.data,
        })
        .where(eq(fulfillment.id, fulfillmentId))

      const fItems = await tx
        .select()
        .from(fulfillmentItem)
        .where(eq(fulfillmentItem.fulfillment_id, fulfillmentId))

      for (const fi of fItems) {
        if (fi.line_item_id) {
          await tx
            .update(orderItem)
            .set({
              fulfilled_quantity: sql`GREATEST(COALESCE(fulfilled_quantity::numeric, 0) - ${fi.quantity}::numeric, 0)`,
            })
            .where(
              and(
                eq(orderItem.item_id, fi.line_item_id),
                eq(orderItem.order_id, orderId),
              ),
            )
        }
      }
    })

    return { fulfillment: { id: fulfillmentId, canceled_at: new Date().toISOString() } }
  },

  async createShipment(orderId: string, fulfillmentId: string, input: CreateShipmentInput) {
    await fulfillmentShipWorkflow.run({
      order_id: orderId, fulfillment_id: fulfillmentId,
      items: input.items, labels: input.labels,
      no_notification: input.no_notification,
    });
    return this.getById(fulfillmentId);
  },

  async markAsDelivered(orderId: string, fulfillmentId: string, _input?: MarkAsDeliveredInput) {
    const db = getDb()

    const [f] = await db
      .select()
      .from(fulfillment)
      .where(and(eq(fulfillment.id, fulfillmentId), isNull(fulfillment.canceled_at)))
      .limit(1)

    if (!f) {
      throw new HTTPException(404, { message: "Fulfillment not found" })
    }

    await db
      .update(fulfillment)
      .set({
        delivered_at: sql`now()`,
      })
      .where(eq(fulfillment.id, fulfillmentId))

    // Send delivered email (fire-and-forget)
    const [delOrd] = await db
      .select()
      .from(order)
      .where(and(eq(order.id, orderId), isNull(order.deleted_at)))
      .limit(1)
    if (delOrd && !delOrd.no_notification && delOrd.email) {
      const displayId = String(delOrd.display_id ?? orderId)
      notificationService.send({
        to: delOrd.email,
        template: "fulfillment.delivered",
        data: { display_id: displayId, order_id: orderId, fulfillment_id: fulfillmentId },
        trigger_type: "fulfillment.delivered",
        resource_id: fulfillmentId,
        resource_type: "fulfillment",
        idempotency_key: `fulfillment-deliver-${fulfillmentId}`,
        no_notification: delOrd.no_notification ?? undefined,
        sender: () => sendOrderDeliveredEmail(delOrd.email!, displayId, orderId),
      })
    }

    await eventBus.emit("fulfillment.delivered", {
      fulfillment_id: fulfillmentId,
      order_id: orderId,
    })

    return this.getById(fulfillmentId)
  },
}
