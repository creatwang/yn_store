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
    const db = getDb()

    // Verify order exists and is not canceled/archived
    const [ord] = await db
      .select()
      .from(order)
      .where(and(eq(order.id, orderId), isNull(order.deleted_at)))
      .limit(1)

    if (!ord) {
      throw new HTTPException(404, { message: "Order not found" })
    }

    if (ord.status === "canceled" || ord.status === "archived") {
      throw new HTTPException(400, { message: `Cannot fulfill order with status: ${ord.status}` })
    }

    // Create fulfillment record
    const fId = generateId("ful")
    await db.insert(fulfillment).values({
      id: fId,
      location_id: input.location_id ?? "",
      created_by: "admin",
      requires_shipping: true,
      metadata: input.metadata ?? null,
      provider_id: null,
      shipping_option_id: input.shipping_option_id ?? null,
    })

    // Create fulfillment items and update order_item.fulfilled_quantity
    for (const item of input.items) {
      await db.insert(fulfillmentItem).values({
        id: generateId("fulitem"),
        title: "",
        sku: "",
        barcode: "",
        quantity: String(item.quantity),
        raw_quantity: { amount: item.quantity, precision: 0 },
        line_item_id: item.item_id,
        fulfillment_id: fId,
      })

      await db
        .update(orderItem)
        .set({
          fulfilled_quantity: sql`COALESCE(fulfilled_quantity::numeric, 0) + ${item.quantity}`,
        })
        .where(and(
          eq(orderItem.item_id, item.item_id),
          eq(orderItem.order_id, orderId),
        ))
    }

    // Create tracking labels
    if (input.tracking_numbers?.length) {
      for (const tn of input.tracking_numbers) {
        await db.insert(fulfillmentLabel).values({
          id: generateId("fLabel"),
          tracking_number: tn,
          tracking_url: input.tracking_url ?? "",
          label_url: "",
          fulfillment_id: fId,
        })
      }
    }

    return this.getById(fId)
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

    // Cancel the fulfillment
    await db
      .update(fulfillment)
      .set({
        canceled_at: sql`now()`,
        data: f.data,
      })
      .where(eq(fulfillment.id, fulfillmentId))

    // Revert fulfilled_quantity on order items
    const fItems = await db
      .select()
      .from(fulfillmentItem)
      .where(eq(fulfillmentItem.fulfillment_id, fulfillmentId))

    for (const fi of fItems) {
      if (fi.line_item_id) {
        await db
          .update(orderItem)
          .set({
            fulfilled_quantity: sql`GREATEST(COALESCE(fulfilled_quantity::numeric, 0) - ${fi.quantity}::numeric, 0)`,
          })
          .where(and(
            eq(orderItem.item_id, fi.line_item_id),
            eq(orderItem.order_id, orderId),
          ))
      }
    }

    return { fulfillment: { id: fulfillmentId, canceled_at: new Date().toISOString() } }
  },

  async createShipment(orderId: string, fulfillmentId: string, input: CreateShipmentInput) {
    const db = getDb()

    const [f] = await db
      .select()
      .from(fulfillment)
      .where(and(eq(fulfillment.id, fulfillmentId), isNull(fulfillment.canceled_at)))
      .limit(1)

    if (!f) {
      throw new HTTPException(404, { message: "Fulfillment not found" })
    }

    if (f.shipped_at) {
      throw new HTTPException(400, { message: "Fulfillment already shipped" })
    }

    // Mark as shipped
    await db
      .update(fulfillment)
      .set({
        shipped_at: sql`now()`,
        marked_shipped_by: "admin",
      })
      .where(eq(fulfillment.id, fulfillmentId))

    // Create tracking labels
    if (input.labels?.length) {
      for (const lbl of input.labels) {
        await db.insert(fulfillmentLabel).values({
          id: generateId("fLabel"),
          tracking_number: lbl.tracking_number,
          tracking_url: lbl.tracking_url,
          label_url: lbl.label_url,
          fulfillment_id: fulfillmentId,
        })
      }
    }

    // Update order_item.shipped_quantity
    if (input.items?.length) {
      for (const item of input.items) {
        await db
          .update(orderItem)
          .set({
            shipped_quantity: sql`COALESCE(shipped_quantity::numeric, 0) + ${item.quantity}`,
          })
          .where(and(
            eq(orderItem.item_id, item.item_id),
            eq(orderItem.order_id, orderId),
          ))
      }
    }

    return this.getById(fulfillmentId)
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

    return this.getById(fulfillmentId)
  },
}
