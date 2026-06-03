/** Workflow: fulfillment.ship — 发货确认 */
import { and, eq, isNull, sql } from "drizzle-orm"
import { generateId, getDb, fulfillment, fulfillmentLabel, orderItem } from "@my-store/db"
import { createWorkflow, step } from "../lib/workflow"
import { eventBus } from "../lib/events"
import { providers } from "../lib/providers"

export const fulfillmentShipWorkflow = createWorkflow("fulfillment-ship", [
  step("validate", async ({ input }) => {
    const db = getDb()
    const [f] = await db.select().from(fulfillment).where(
      and(eq(fulfillment.id, input.fulfillment_id), isNull(fulfillment.canceled_at)),
    ).limit(1)
    if (!f) throw new Error("Fulfillment not found")
    return { fulfillment: f }
  }),

  step("ship", async ({ input }) => {
    const db = getDb()
    await db.update(fulfillment).set({ shipped_at: sql`now()`, marked_shipped_by: "admin" })
      .where(eq(fulfillment.id, input.fulfillment_id))
    if (input.labels?.length) {
      for (const l of input.labels) {
        await db.insert(fulfillmentLabel).values({
          id: generateId("fLabel"), tracking_number: l.tracking_number,
          tracking_url: l.tracking_url, label_url: l.label_url, fulfillment_id: input.fulfillment_id,
        })
      }
    }
    if (input.items?.length) {
      for (const item of input.items) {
        await db.update(orderItem).set({ shipped_quantity: String(item.quantity) })
          .where(and(eq(orderItem.item_id, item.item_id), eq(orderItem.order_id, input.order_id)))
      }
    }
    return { fulfillmentId: input.fulfillment_id, orderId: input.order_id }
  }, async ({ input }) => {
    const db = getDb()
    await db.update(fulfillment).set({ shipped_at: null }).where(eq(fulfillment.id, input.fulfillment_id))
  }),

  step("confirm-external", async ({ output }) => {
    const sp = providers.shipping.get("noop")!
    await sp.track({ tracking_number: output["ship"]?.fulfillmentId ?? "unknown" })
    return {}
  }),

  step("finalize", async ({ output }) => {
    const { fulfillmentId, orderId } = output["ship"]
    await eventBus.emit("fulfillment.shipped", { fulfillment_id: fulfillmentId, order_id: orderId })
    return { fulfillmentId }
  }),
], { providers })
