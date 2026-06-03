import { and, count, desc, eq, ilike, isNull, sql } from "drizzle-orm"
import { generateId, getDb, payment, capture, refund } from "@my-store/db"
import type { CapturePaymentInput, RefundPaymentInput } from "@my-store/validators"
import type { AdminGetPaymentsParamsType } from "@my-store/validators/admin-list-params"
import { listLimitOffset } from "../lib/query-filters"
import { HTTPException } from "hono/http-exception"
import { paymentCaptureWorkflow } from "../workflows/payment-capture"
import { paymentRefundWorkflow } from "../workflows/payment-refund"

export const paymentService = {
  async listPayments(query: AdminGetPaymentsParamsType) {
    const db = getDb()
    const { limit, offset } = listLimitOffset(query, { limit: 20, offset: 0 })
    const conditions = [isNull(payment.deleted_at)]

    const q = typeof query.q === "string" ? query.q : undefined
    if (q?.trim()) {
      conditions.push(ilike(payment.id, `%${q.trim()}%`))
    }

    const where = and(...conditions)

    const [payments, [{ total }]] = await Promise.all([
      db
        .select()
        .from(payment)
        .where(where)
        .orderBy(desc(payment.created_at))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(payment).where(where),
    ])

    return {
      payments,
      count: Number(total),
      limit,
      offset,
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
