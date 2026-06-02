/** Workflow: return.create — 创建退货（预留 PaymentProvider.refund） */
import { and, eq, isNull, sql } from "drizzle-orm"
import { generateId, getDb, orderReturn, returnItem, orderItem, orderChange } from "@my-store/db"
import { createWorkflow, step } from "../lib/workflow"
import { eventBus } from "../lib/events"
import { providers } from "../lib/providers"

type Input = { order_id: string; order_version?: number; location_id?: string; refund_amount?: number; items: Array<{ item_id: string; quantity: number; note?: string }> }

export const returnCreateWorkflow = createWorkflow("return-create", [
  step("create-return", async ({ input }) => {
    const db = getDb()
    const id = generateId("ret")
    const [created] = await db.insert(orderReturn).values({
      id, order_id: input.order_id, order_version: input.order_version ?? 1,
      location_id: input.location_id ?? null,
      refund_amount: input.refund_amount ? String(input.refund_amount) : null,
      status: "open", created_by: "admin",
    }).returning()

    for (const item of input.items) {
      await db.insert(returnItem).values({
        id: generateId("retitm"), return_id: id,
        item_id: item.item_id, quantity: String(item.quantity),
        raw_quantity: { amount: item.quantity, precision: 0 },
        note: item.note ?? null,
      })
      await db.update(orderItem).set({
        return_requested_quantity: sql`COALESCE(return_requested_quantity::numeric, 0) + ${item.quantity}`,
      }).where(and(eq(orderItem.item_id, item.item_id), eq(orderItem.order_id, input.order_id)))
    }

    await db.insert(orderChange).values({
      id: generateId("ordch"), order_id: input.order_id, return_id: id,
      version: input.order_version ?? 1, change_type: "return_request", status: "pending",
      created_by: "admin",
    })

    return { returnId: id, orderId: input.order_id }
  }, async ({ output }) => {
    const db = getDb()
    const { returnId } = output["create-return"] ?? {}
    if (returnId) {
      await db.delete(orderChange).where(eq(orderChange.return_id, returnId))
      await db.delete(returnItem).where(eq(returnItem.return_id, returnId))
      await db.delete(orderReturn).where(eq(orderReturn.id, returnId))
    }
  }),

  step("notify", async ({ output }) => {
    const { returnId, orderId } = output["create-return"]
    await eventBus.emit("return.requested", { return_id: returnId, order_id: orderId })
    return { returnId }
  }),
], { providers })
