import { and, count, desc, eq, isNull, sql } from "drizzle-orm"
import { generateId, getDb, payment, capture, refund } from "@my-store/db"
import type { ListPaymentsQuery, CapturePaymentInput, RefundPaymentInput } from "@my-store/validators"
import { HTTPException } from "hono/http-exception"

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
    const db = getDb()
    const [pmt] = await db
      .select()
      .from(payment)
      .where(and(eq(payment.id, id), isNull(payment.deleted_at)))
      .limit(1)

    if (!pmt) {
      throw new HTTPException(404, { message: "Payment not found" })
    }

    // Create capture record
    const capId = generateId("capt")
    await db.insert(capture).values({
      id: capId,
      payment_id: id,
      amount: String(input?.amount ?? pmt.amount),
      raw_amount: pmt.raw_amount,
      created_by: "admin",
    })

    // Update payment captured_at
    const [updated] = await db
      .update(payment)
      .set({
        captured_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where(eq(payment.id, id))
      .returning()

    return { payment: updated }
  },

  async refund(id: string, input: RefundPaymentInput) {
    const db = getDb()
    const [pmt] = await db
      .select()
      .from(payment)
      .where(and(eq(payment.id, id), isNull(payment.deleted_at)))
      .limit(1)

    if (!pmt) {
      throw new HTTPException(404, { message: "Payment not found" })
    }

    const refId = generateId("ref")
    await db.insert(refund).values({
      id: refId,
      payment_id: id,
      amount: String(input.amount),
      raw_amount: { amount: input.amount, precision: 2 },
      note: input.note ?? null,
      created_by: "admin",
    })

    return { refund: { id: refId, amount: input.amount, note: input.note } }
  },
}
