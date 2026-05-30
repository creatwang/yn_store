import { eq, sql } from "drizzle-orm"
import { generateId, getDb, fulfillment, fulfillmentLabel, orderItem } from "@my-store/db"
import type { CreateShipmentInput } from "@my-store/validators"
import { HTTPException } from "hono/http-exception"
import { createWorkflow, step } from "../lib/workflow"

type Input = CreateShipmentInput & { order_id: string; fulfillment_id: string }

export const createShipmentWorkflow = createWorkflow<Input, any>("create-shipment", [
  step("ship", async ({ input }: { input: Input }) => {
    const db = getDb()
    const [f] = await db.select().from(fulfillment)
      .where(eq(fulfillment.id, input.fulfillment_id))
      .limit(1)
    if (!f) throw new HTTPException(404, { message: "Fulfillment not found" })

    await db.update(fulfillment)
      .set({ shipped_at: sql`now()`, marked_shipped_by: "admin" })
      .where(eq(fulfillment.id, input.fulfillment_id))

    if (input.labels?.length) {
      for (const lbl of input.labels) {
        await db.insert(fulfillmentLabel).values({
          id: generateId("fLabel"),
          tracking_number: lbl.tracking_number,
          tracking_url: lbl.tracking_url,
          label_url: lbl.label_url,
          fulfillment_id: input.fulfillment_id,
        })
      }
    }

    if (input.items?.length) {
      for (const item of input.items) {
        await db.update(orderItem)
          .set({ shipped_quantity: String(item.quantity) })
          .where(eq(orderItem.item_id, item.item_id))
      }
    }

    return { fulfillment: { id: input.fulfillment_id, shipped_at: new Date().toISOString() } }
  }),
])
