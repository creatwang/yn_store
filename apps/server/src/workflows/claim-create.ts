/** Workflow: claim.create — 创建索赔 */
import { and, eq, sql } from "drizzle-orm"
import { generateId, getDb, orderClaim, orderClaimItem, orderChange, orderChangeAction, orderItem } from "@my-store/db"
import { createWorkflow, step } from "../lib/infra/workflow/workflow"
import { eventBus } from "../lib/infra/events/events"
import { providers } from "../lib/payment/providers"
import { createCompanionReturn } from "../services/order/admin-order-preview"

export const claimCreateWorkflow = createWorkflow("claim-create", [
  step("create-claim", async ({ input }) => {
    const db = getDb()
    const id = generateId("claim")
    const changeId = generateId("ordch")

    await db.insert(orderClaim).values({
      id, order_id: input.order_id, order_version: input.order_version ?? 1,
      type: input.type ?? "refund",
      refund_amount: input.refund_amount ? String(input.refund_amount) : null,
      created_by: "admin",
    }).returning()

    await db.insert(orderChange).values({
      id: changeId, order_id: input.order_id, claim_id: id,
      version: input.order_version ?? 1, change_type: "claim", status: "pending",
      created_by: "admin",
    })

    for (let i = 0; i < (input.claim_items ?? []).length; i++) {
      const ci = input.claim_items[i]
      await db.insert(orderClaimItem).values({
        id: generateId("clmitm"), claim_id: id, item_id: ci.item_id,
        reason: ci.reason ?? null, quantity: String(ci.quantity),
        raw_quantity: { amount: ci.quantity, precision: 0 },
        is_additional_item: ci.is_additional_item ?? false, note: ci.note ?? null,
      })
      await db.update(orderItem).set({
        return_requested_quantity: sql`COALESCE(return_requested_quantity::numeric, 0) + ${ci.quantity}`,
      }).where(and(eq(orderItem.item_id, ci.item_id), eq(orderItem.order_id, input.order_id)))
      await db.insert(orderChangeAction).values({
        id: generateId("ordchact"), order_id: input.order_id, order_change_id: changeId,
        ordering: i, action: ci.is_additional_item ? "ITEM_ADD" : "WRITE_OFF_ITEM",
        reference: "order_item", reference_id: ci.item_id,
        details: { quantity: ci.quantity, reason: ci.reason, note: ci.note },
        created_at: sql`now()`, updated_at: sql`now()`,
      })
    }

    return { claimId: id, changeId, orderId: input.order_id }
  }, async ({ output }) => {
    const db = getDb()
    const created = output["create-claim"] ?? {}
    const claimId = created.claimId as string | undefined
    const changeId = created.changeId as string | undefined
    if (claimId) {
      if (changeId) {
        await db.delete(orderChangeAction).where(eq(orderChangeAction.order_change_id, changeId))
      }
      await db.delete(orderChange).where(eq(orderChange.claim_id, claimId))
      await db.delete(orderClaimItem).where(eq(orderClaimItem.claim_id, claimId))
      await db.delete(orderClaim).where(eq(orderClaim.id, claimId))
    }
  }),

  step("companion-return", async ({ input, output }) => {
    const { claimId } = output["create-claim"]
    const returnId = await createCompanionReturn(input.order_id, input.order_version ?? 1)
    const db = getDb()
    await db.update(orderChange).set({ return_id: returnId })
      .where(eq(orderChange.claim_id, claimId))
    return { returnId }
  }),

  step("notify", async ({ output }) => {
    const { claimId, orderId } = output["create-claim"]
    const { returnId } = output["companion-return"]
    await eventBus.emit("claim.created", { claim_id: claimId, order_id: orderId, return_id: returnId })
    return { claimId }
  }),
], { providers })
