import { and, eq, isNull, sql } from "drizzle-orm"
import { getDb, order } from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import { createWorkflow, step } from "../lib/workflow"

type Input = { id: string }

export const cancelOrderWorkflow = createWorkflow<Input, any>("cancel-order", [
  step("cancel", async ({ input }: { input: Input }) => {
    const db = getDb()
    const [u] = await db
      .update(order)
      .set({ status: "canceled", canceled_at: sql`now()`, updated_at: sql`now()` })
      .where(eq(order.id, input.id))
      .returning()
    if (!u) throw new HTTPException(404, { message: "Order not found" })
    return { order: u }
  }),
])
