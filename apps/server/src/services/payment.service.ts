import { and, count, desc, eq, ilike, inArray, isNull } from "drizzle-orm"
import { getDb, payment, paymentProvider } from "@my-store/db"
import type { CapturePaymentInput, RefundPaymentInput } from "@my-store/validators"
import type {
  AdminGetPaymentProvidersParamsType,
  AdminGetPaymentsParamsType,
} from "@my-store/validators/admin-list-params"
import { listLimitOffset } from "../lib/query-filters"
import { paymentCaptureWorkflow } from "../workflows/payment-capture"
import { paymentRefundWorkflow } from "../workflows/payment-refund"

const FALLBACK_PAYMENT_PROVIDERS = [
  { id: "pp_system_default", is_enabled: true },
] as const

export const paymentService = {
  async listPaymentProviders(query: AdminGetPaymentProvidersParamsType) {
    const db = getDb()
    const { limit, offset } = listLimitOffset(query, { limit: 20, offset: 0 })
    const conditions = []

    if (query.is_enabled === true || query.is_enabled === "true") {
      conditions.push(eq(paymentProvider.is_enabled, true))
    } else if (query.is_enabled === false || query.is_enabled === "false") {
      conditions.push(eq(paymentProvider.is_enabled, false))
    }

    const idFilter = query.id
    if (idFilter !== undefined) {
      const ids = Array.isArray(idFilter) ? idFilter : [idFilter]
      if (ids.length) {
        conditions.push(inArray(paymentProvider.id, ids))
      }
    }

    const where = conditions.length ? and(...conditions) : undefined

    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(paymentProvider)
        .where(where)
        .orderBy(desc(paymentProvider.id))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(paymentProvider).where(where),
    ])

    const payment_providers =
      rows.length > 0
        ? rows.map((p) => ({ id: p.id, is_enabled: p.is_enabled }))
        : [...FALLBACK_PAYMENT_PROVIDERS]

    return {
      payment_providers,
      count: rows.length > 0 ? Number(total) : payment_providers.length,
      limit,
      offset,
    }
  },

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
