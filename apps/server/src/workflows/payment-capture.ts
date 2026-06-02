/** Workflow: payment.capture — 支付捕获 */
import { eq, isNull, sql } from "drizzle-orm"
import { generateId, getDb, payment, capture } from "@my-store/db"
import { createWorkflow, step } from "../lib/workflow"
import { providers } from "../lib/providers"

type Input = { paymentId: string; amount?: number }

export const paymentCaptureWorkflow = createWorkflow("payment-capture", [
  step("validate", async ({ input }) => {
    const db = getDb()
    const [pmt] = await db.select().from(payment).where(
      eq(payment.id, input.paymentId),
    ).limit(1)
    if (!pmt) throw new Error("Payment not found")
    return { payment: pmt }
  }),

  step("create-capture", async ({ input }) => {
    const db = getDb()
    const capId = generateId("capt")
    const [pmt] = await db.select().from(payment).where(eq(payment.id, input.paymentId)).limit(1)
    await db.insert(capture).values({
      id: capId, payment_id: input.paymentId,
      amount: String(input.amount ?? pmt?.amount ?? 0),
      raw_amount: pmt?.raw_amount ?? { value: "0", precision: 20 },
      created_by: "admin",
    })
    return { captureId: capId }
  }, async ({ output }) => {
    const db = getDb()
    const { captureId } = output["create-capture"] ?? {}
    if (captureId) await db.delete(capture).where(eq(capture.id, captureId))
  }),

  step("capture-external", async ({ output }) => {
    const { captureId } = output["create-capture"]
    const pp = providers.payment.get("noop")!
    const r = await pp.capture({ transaction_id: captureId, amount: 0 })
    return { externalCaptureId: r.capture_id }
  }, async ({ output }) => {
    const db = getDb()
    const { captureId } = output["create-capture"] ?? {}
    if (captureId) await db.update(capture).set({ deleted_at: sql`now()` }).where(eq(capture.id, captureId))
  }),

  step("confirm", async ({ input, output }) => {
    const db = getDb()
    await db.update(payment).set({ captured_at: sql`now()`, updated_at: sql`now()` })
      .where(eq(payment.id, input.paymentId))
    return { status: "captured" }
  }),
], { providers })
