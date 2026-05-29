import { and, eq, isNull } from "drizzle-orm"
import { getDb, order } from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import { createWorkflow, step } from "../lib/workflow"

export const cancelOrderWorkflow = createWorkflow("cancel-order", [
  step("cancel", async ({ input }) => {
    const db = getDb()
    const [u] = await db
      .update(order)
      .set({ status: "canceled", canceled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .where(eq(order.id, input.id))
      .returning()
    if (!u) throw new HTTPException(404, { message: "Order not found" })
    return { order: u }
  }),
])
