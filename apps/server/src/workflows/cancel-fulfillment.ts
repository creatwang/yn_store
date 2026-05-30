import { eq, isNull, sql } from "drizzle-orm"
import { getDb, fulfillment, fulfillmentItem, inventoryItem, inventoryLevel, orderItem } from "@my-store/db"
import type { CancelFulfillmentInput } from "@my-store/validators"
import { HTTPException } from "hono/http-exception"
import { createWorkflow, step } from "../lib/workflow"

type Input = CancelFulfillmentInput & { order_id: string; fulfillment_id: string }

export const cancelFulfillmentWorkflow = createWorkflow<Input, any>("cancel-fulfillment", [
  step("cancel", async ({ input }: { input: Input }) => {
    const db = getDb()
    const [f] = await db.select().from(fulfillment)
      .where(eq(fulfillment.id, input.fulfillment_id))
      .limit(1)
    if (!f) throw new HTTPException(404, { message: "Fulfillment not found" })

    await db.update(fulfillment)
      .set({ canceled_at: sql`now()` })
      .where(eq(fulfillment.id, input.fulfillment_id))

    const fItems = await db.select().from(fulfillmentItem)
      .where(eq(fulfillmentItem.fulfillment_id, input.fulfillment_id))

    for (const fi of fItems) {
      if (fi.line_item_id) {
        await db.update(orderItem)
          .set({ fulfilled_quantity: "0" })
          .where(eq(orderItem.item_id, fi.line_item_id))
      }
    }

    return { fulfillment: { id: input.fulfillment_id, canceled_at: new Date().toISOString() } }
  }),
])
