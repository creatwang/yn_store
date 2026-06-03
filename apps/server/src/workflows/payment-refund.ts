/** Workflow: payment.refund — 支付退款 */
import { eq, sql } from "drizzle-orm"
import { generateId, getDb, payment, refund } from "@my-store/db"
import { createWorkflow, step } from "../lib/workflow"
import { providers } from "../lib/providers"

type Input = { paymentId: string; amount: number; reason?: string }

export const paymentRefundWorkflow = createWorkflow("payment-refund", [
  step("validate", async ({ input }) => {
    const db = getDb()
    const [pmt] = await db.select().from(payment).where(eq(payment.id, input.paymentId)).limit(1)
    if (!pmt) throw new Error("Payment not found")
    if (!pmt.captured_at) throw new Error("Payment not captured")
    return { payment: pmt }
  }),

  step("create-refund", async ({ input }) => {
    const db = getDb()
    const refId = generateId("ref")
    await db.insert(refund).values({
      id: refId,
      payment_id: input.paymentId,
      amount: String(input.amount),
      raw_amount: { value: String(input.amount), precision: 20 },
      note: input.reason ?? null,
      created_by: "admin",
    })
    return { refundId: refId }
  }, async ({ output }) => {
    const db = getDb()
    const { refundId } = output["create-refund"] ?? {}
    if (refundId) await db.delete(refund).where(eq(refund.id, refundId))
  }),

  step("refund-external", async ({ output, input }) => {
    const { refundId } = output["create-refund"]
    const pp = providers.payment.get("noop")!
    const r = await pp.refund({ transaction_id: refundId, amount: input.amount, reason: input.reason })
    return { externalRefundId: r.refund_id }
  }, async ({ output }) => {
    const db = getDb()
    const { refundId } = output["create-refund"] ?? {}
    if (refundId) await db.delete(refund).where(eq(refund.id, refundId))
  }),

  step("confirm", async ({ input }) => {
    const db = getDb()
    await db.update(payment).set({ updated_at: sql`now()` }).where(eq(payment.id, input.paymentId))
    return { status: "refunded" }
  }),
], { providers })
