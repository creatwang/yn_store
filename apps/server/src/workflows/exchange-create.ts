/** Workflow: exchange.create — 创建换货 */
import { eq, sql } from "drizzle-orm"
import { generateId, getDb, orderExchange, orderChange, orderChangeAction } from "@my-store/db"
import { createWorkflow, step } from "../lib/infra/workflow/workflow"
import { eventBus } from "../lib/infra/events/events"
import { providers } from "../lib/payment/providers"
import { createCompanionReturn } from "../services/order/admin-order-preview"

export const exchangeCreateWorkflow = createWorkflow("exchange-create", [
  step("create-exchange", async ({ input }) => {
    const db = getDb()
    const id = generateId("exchange")
    await db.insert(orderExchange).values({
      id, order_id: input.order_id, order_version: input.order_version ?? 1,
      difference_due: input.difference_due ? String(input.difference_due) : null,
      allow_backorder: input.allow_backorder ?? false, created_by: "admin",
    }).returning()

    const changeId = generateId("ordch")
    await db.insert(orderChange).values({
      id: changeId, order_id: input.order_id, exchange_id: id,
      version: input.order_version ?? 1, change_type: "exchange", status: "pending",
      created_by: "admin",
    })

    const outbound = input.additional_items ?? []
    for (let i = 0; i < outbound.length; i++) {
      const item = outbound[i]
      await db.insert(orderChangeAction).values({
        id: generateId("ordchact"), order_id: input.order_id, order_change_id: changeId,
        ordering: i, action: "ITEM_ADD", reference: "product_variant",
        reference_id: item.variant_id,
        details: { quantity: item.quantity },
        created_at: sql`now()`, updated_at: sql`now()`,
      })
    }

    return { exchangeId: id, changeId, orderId: input.order_id }
  }, async ({ output }) => {
    const db = getDb()
    const created = output["create-exchange"] ?? {}
    const exchangeId = created.exchangeId as string | undefined
    const changeId = created.changeId as string | undefined
    if (exchangeId) {
      if (changeId) {
        await db.delete(orderChangeAction).where(eq(orderChangeAction.order_change_id, changeId))
      }
      await db.delete(orderChange).where(eq(orderChange.exchange_id, exchangeId))
      await db.delete(orderExchange).where(eq(orderExchange.id, exchangeId))
    }
  }),

  step("companion-return", async ({ input, output }) => {
    const { exchangeId } = output["create-exchange"]
    const returnId = await createCompanionReturn(input.order_id, input.order_version ?? 1)
    const db = getDb()
    await db.update(orderChange).set({ return_id: returnId })
      .where(eq(orderChange.exchange_id, exchangeId))
    return { returnId }
  }),

  step("notify", async ({ output }) => {
    const { exchangeId, orderId } = output["create-exchange"]
    const { returnId } = output["companion-return"]
    await eventBus.emit("exchange.created", { exchange_id: exchangeId, order_id: orderId, return_id: returnId })
    return { exchangeId }
  }),
], { providers })
