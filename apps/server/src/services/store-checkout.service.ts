import { and, eq, isNull, sql } from "drizzle-orm"
import {
  cartShippingMethod,
  generateId,
  getDb,
  paymentCollection,
  paymentProvider,
  paymentSession,
} from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import { sqlRows } from "../lib/infra/sql/sql-rows"
import { cartService } from "./cart.service"

export const storeShippingService = {
  async listOptions(cartId?: string) {
    const db = getDb()
    // raw SQL: 线上库 shipping_option 列可能与 Drizzle schema 不完全一致
    const result = await db.execute(sql`
      SELECT id, name, data, provider_id
      FROM shipping_option
      WHERE deleted_at IS NULL
      LIMIT 50
    `)
    const rows = sqlRows<Record<string, unknown>>(result)

    const shipping_options = rows.map((opt) => ({
      id: String(opt.id),
      name: String(opt.name),
      amount: Number((opt.data as Record<string, unknown>)?.amount ?? 10),
      price_incl_tax: Number((opt.data as Record<string, unknown>)?.amount ?? 10),
      data: opt.data,
      provider_id: opt.provider_id,
    }))

    return { shipping_options, count: shipping_options.length, cart_id: cartId }
  },

  async calculate(optionId: string) {
    const db = getDb()
    const result = await db.execute(sql`
      SELECT id, name, data
      FROM shipping_option
      WHERE id = ${optionId} AND deleted_at IS NULL
      LIMIT 1
    `)
    const rows = sqlRows<Record<string, unknown>>(result)
    const opt = rows[0]
    if (!opt) throw new HTTPException(404, { message: "运输选项不存在" })

    const amount = Number((opt.data as Record<string, unknown>)?.amount ?? 10)
    return {
      shipping_option: {
        id: opt.id,
        name: opt.name,
        amount,
        calculated_price: amount,
      },
    }
  },
}

export const storePaymentService = {
  async listProviders() {
    const db = getDb()
    const rows = await db.select().from(paymentProvider)
    const providers =
      rows.length > 0
        ? rows.filter((p) => p.is_enabled)
        : [{ id: "pp_system_default", is_enabled: true }]

    return {
      payment_providers: providers.map((p) => ({ id: p.id, is_enabled: p.is_enabled })),
    }
  },

  async createCollection(input: { cart_id?: string; currency_code?: string; amount?: number }) {
    const db = getDb()
    const id = generateId("paycol")
    const amount = input.amount ?? 0

    await db.insert(paymentCollection).values({
      id,
      currency_code: input.currency_code ?? "USD",
      amount: String(amount),
      raw_amount: { amount, precision: 2 },
      status: "not_paid",
      created_at: sql`now()`,
      updated_at: sql`now()`,
    })

    if (input.cart_id) {
      // raw SQL: cart_payment_collection 表无 Drizzle schema 映射
      await db.execute(sql`
        INSERT INTO cart_payment_collection (id, cart_id, payment_collection_id)
        VALUES (${generateId("cpc")}, ${input.cart_id}, ${id})
      `)
    }

    return { payment_collection: { id, amount, currency_code: input.currency_code ?? "USD" } }
  },

  async createSession(collectionId: string, input: { provider_id?: string; amount?: number }) {
    const db = getDb()
    const [pc] = await db
      .select()
      .from(paymentCollection)
      .where(and(eq(paymentCollection.id, collectionId), isNull(paymentCollection.deleted_at)))
      .limit(1)

    if (!pc) throw new HTTPException(404, { message: "支付集合不存在" })

    const id = generateId("payses")
    const amount = input.amount ?? Number(pc.amount ?? 0)
    const providerId = input.provider_id ?? "pp_system_default"

    const [session] = await db
      .insert(paymentSession)
      .values({
        id,
        payment_collection_id: collectionId,
        provider_id: providerId,
        currency_code: pc.currency_code,
        amount: String(amount),
        raw_amount: { amount, precision: 2 },
        data: { status: "pending" },
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning()

    return { payment_session: session }
  },

  async authorizeManualSession(collectionId: string, sessionId: string) {
    const db = getDb()
    const [session] = await db
      .select()
      .from(paymentSession)
      .where(
        and(
          eq(paymentSession.id, sessionId),
          eq(paymentSession.payment_collection_id, collectionId),
          isNull(paymentSession.deleted_at),
        ),
      )
      .limit(1)

    if (!session) throw new HTTPException(404, { message: "支付会话不存在" })

    const [updated] = await db
      .update(paymentSession)
      .set({
        authorized_at: sql`now()`,
        data: { status: "authorized" },
        updated_at: sql`now()`,
      })
      .where(eq(paymentSession.id, sessionId))
      .returning()

    await db
      .update(paymentCollection)
      .set({
        status: "authorized",
        authorized_amount: session.amount,
        updated_at: sql`now()`,
      })
      .where(eq(paymentCollection.id, collectionId))

    return { payment_session: updated }
  },
}

export const cartCheckoutService = {
  async addShippingMethod(cartId: string, input: { option_id: string; data?: Record<string, unknown> }) {
    const db = getDb()
    await cartService.getById(cartId)

    let optName = "Standard Shipping"
    let amount = 10

    if (input.option_id !== "default") {
      const result = await db.execute(sql`
        SELECT id, name, data FROM shipping_option
        WHERE id = ${input.option_id} AND deleted_at IS NULL LIMIT 1
      `)
      const rows = sqlRows<Record<string, unknown>>(result)
      const opt = rows[0]
      if (opt) {
        optName = String(opt.name)
        amount = Number((opt.data as Record<string, unknown>)?.amount ?? 10)
      }
    }

    await db
      .update(cartShippingMethod)
      .set({ deleted_at: sql`now()` })
      .where(and(eq(cartShippingMethod.cart_id, cartId), isNull(cartShippingMethod.deleted_at)))

    const id = generateId("casm")
    const [method] = await db
      .insert(cartShippingMethod)
      .values({
        id,
        cart_id: cartId,
        name: optName,
        amount: String(amount),
        raw_amount: { amount, precision: 2 },
        shipping_option_id: input.option_id,
        data: input.data ?? null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning()

    return { shipping_method: method }
  },

  async estimateTotal(cartId: string) {
    const { items, shipping_methods } = await cartService.getById(cartId)
    const itemsTotal = items.reduce(
      (sum, item) => sum + Number(item.unit_price ?? 0) * item.quantity,
      0,
    )
    const shippingTotal = shipping_methods.reduce(
      (sum, sm) => sum + Number(sm.amount ?? 0),
      0,
    )
    return { subtotal: itemsTotal, shipping_total: shippingTotal, total: itemsTotal + shippingTotal }
  },
}
