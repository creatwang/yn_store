import { and, count, desc, eq, isNull, sql } from "drizzle-orm"
import { generateId, getDb, payment, capture, refund } from "@my-store/db"
import type { ListPaymentsQuery, CapturePaymentInput, RefundPaymentInput } from "@my-store/validators"
import { HTTPException } from "hono/http-exception"
import { paymentCaptureWorkflow } from "../workflows/payment-capture"
import { paymentRefundWorkflow } from "../workflows/payment-refund"

export const paymentService = {
  async listPayments(query: ListPaymentsQuery) {
    const db = getDb()
    const conditions = [isNull(payment.deleted_at)]

    if (query.status) {
      conditions.push(eq(payment.captured_at, query.status === "captured" ? sql`now()` : sql`null`))
    }

    const where = and(...conditions)

    const [payments, [{ total }]] = await Promise.all([
      db
        .select()
        .from(payment)
        .where(where)
        .orderBy(desc(payment.created_at))
        .limit(query.limit)
        .offset(query.offset),
      db.select({ total: count() }).from(payment).where(where),
    ])

    return {
      payments,
      count: Number(total),
      limit: query.limit,
      offset: query.offset,
    }
  },

  async capture(id: string, input?: CapturePaymentInput) {
    const amount = input?.amount ? Number(input.amount) : 0
    await paymentCaptureWorkflow.run({ paymentId: id, amount })
    const db = getDb()
    const [updated] = await db.select().from(payment).where(eq(payment.id, id)).limit(1)
    return { payment: updated }
  },

  async refund(id: string, input: RefundPaymentInput) {
    await paymentRefundWorkflow.run({ paymentId: id, amount: input.amount })
    const db = getDb()
    const [updated] = await db.select().from(payment).where(eq(payment.id, id)).limit(1)
    return { payment: updated }
  },
}
