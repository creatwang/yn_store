import { and, eq, isNull, sql } from "drizzle-orm"
import { generateId, getDb, fulfillment, fulfillmentItem, fulfillmentLabel, inventoryItem, inventoryLevel, order, orderItem, productVariant, reservationItem } from "@my-store/db"
import type { CreateFulfillmentInput } from "@my-store/validators"
import { HTTPException } from "hono/http-exception"
import { createWorkflow, step } from "../lib/workflow"
import { eventBus } from "../lib/events"

type Input = CreateFulfillmentInput & { order_id: string }

export const createFulfillmentWorkflow = createWorkflow<Input, any>("create-fulfillment", [
  step("validate-order", async ({ input }) => {
    const db = getDb()
    const [ord] = await db.select({ id: order.id }).from(order)
      .where(and(eq(order.id, input.order_id), isNull(order.deleted_at)))
      .limit(1)
    if (!ord) throw new HTTPException(404, { message: "Order not found" })
    if (ord.status === "canceled" || ord.status === "archived") {
      throw new HTTPException(400, { message: `Cannot fulfill order with status: ${ord.status}` })
    }
    return { order: ord }
  }),
  step("process", async ({ input }) => {
    const db = getDb()
    const fId = generateId("ful")
    await db.insert(fulfillment).values({
      id: fId, location_id: input.location_id ?? "",
      created_by: "admin", requires_shipping: true,
      metadata: input.metadata ?? null, provider_id: null,
      shipping_option_id: input.shipping_option_id ?? null,
    })

    for (const item of input.items) {
      await db.insert(fulfillmentItem).values({
        id: generateId("fulitem"), title: "", sku: "", barcode: "",
        quantity: String(item.quantity),
        raw_quantity: { amount: item.quantity, precision: 0 },
        line_item_id: item.item_id,
        fulfillment_id: fId,
      })
      await db.update(orderItem).set({
        fulfilled_quantity: sql`COALESCE(fulfilled_quantity::numeric, 0) + ${item.quantity}`,
      }).where(and(eq(orderItem.item_id, item.item_id), eq(orderItem.order_id, input.order_id)))
    }

    if (input.tracking_numbers?.length) {
      for (const tn of input.tracking_numbers) {
        await db.insert(fulfillmentLabel).values({
          id: generateId("fLabel"),
          tracking_number: tn, tracking_url: input.tracking_url ?? "", label_url: "",
          fulfillment_id: fId,
        })
      }
    }

    await eventBus.emit("fulfillment.created", { fulfillment_id: fId })
    return { fulfillment_id: fId }
  }),
])
