import { eq, sql } from "drizzle-orm"
import { getDb, order } from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import { createWorkflow, step } from "../lib/workflow"

type Input = { id: string }

export const completeOrderWorkflow = createWorkflow<Input, any>("complete-order", [
  step("complete", async ({ input }: { input: Input }) => {
    const db = getDb()
    const [u] = await db
      .update(order)
      .set({ status: "completed", updated_at: sql`now()` })
      .where(eq(order.id, input.id))
      .returning()
    if (!u) throw new HTTPException(404, { message: "Order not found" })
    return { order: u }
  }),
])
