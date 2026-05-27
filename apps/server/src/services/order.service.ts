import { and, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  order,
} from "@my-store/db"
import type {
  CreateOrderInput,
  ListOrdersQuery,
  UpdateOrderInput,
} from "@my-store/validators"
import { HTTPException } from "hono/http-exception"

export const orderService = {
  async list(query: ListOrdersQuery) {
    const db = getDb()
    const conditions = [isNull(order.deleted_at)]

    if (query.status) {
      conditions.push(eq(order.status, query.status))
    }

    if (query.customer_id) {
      conditions.push(eq(order.customer_id, query.customer_id))
    }

    if (query.q) {
      conditions.push(
        or(
          ilike(order.email, `%${query.q}%`)
        )!
      )
    }

    const where = and(...conditions)

    const [orders, [{ total }]] = await Promise.all([
      db
        .select()
        .from(order)
        .where(where)
        .orderBy(desc(order.created_at))
        .limit(query.limit)
        .offset(query.offset),
      db.select({ total: count() }).from(order).where(where),
    ])

    return {
      orders,
      count: Number(total),
      limit: query.limit,
      offset: query.offset,
    }
  },

  async listStore(customerId: string, query: ListOrdersQuery) {
    const db = getDb()
    const conditions = [
      isNull(order.deleted_at),
      eq(order.customer_id, customerId),
    ]

    if (query.status) {
      conditions.push(eq(order.status, query.status))
    }

    const where = and(...conditions)

    const [orders, [{ total }]] = await Promise.all([
      db
        .select({
          id: order.id,
          display_id: order.display_id,
          status: order.status,
          email: order.email,
          currency_code: order.currency_code,
          created_at: order.created_at,
        })
        .from(order)
        .where(where)
        .orderBy(desc(order.created_at))
        .limit(query.limit)
        .offset(query.offset),
      db.select({ total: count() }).from(order).where(where),
    ])

    return {
      orders,
      count: Number(total),
      limit: query.limit,
      offset: query.offset,
    }
  },

  async getById(id: string, storeOnly = false, customerId?: string) {
    const db = getDb()
    const conditions = [eq(order.id, id), isNull(order.deleted_at)]

    if (storeOnly && customerId) {
      conditions.push(eq(order.customer_id, customerId))
    }

    const [item] = await db
      .select()
      .from(order)
      .where(and(...conditions))
      .limit(1)

    if (!item) {
      throw new HTTPException(404, { message: "Order not found" })
    }

    return { order: item }
  },

  async create(input: CreateOrderInput) {
    const db = getDb()
    const id = generateId("order")

    const [created] = await db
      .insert(order)
      .values({
        id,
        region_id: input.region_id ?? null,
        customer_id: input.customer_id ?? null,
        sales_channel_id: input.sales_channel_id ?? null,
        email: input.email ?? null,
        currency_code: input.currency_code ?? "USD",
        metadata: input.metadata ?? null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning()

    return { order: created }
  },

  async update(id: string, input: UpdateOrderInput) {
    const db = getDb()
    await this.getById(id)

    const [updated] = await db
      .update(order)
      .set({
        ...(input.region_id !== undefined && { region_id: input.region_id }),
        ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
        ...(input.sales_channel_id !== undefined && { sales_channel_id: input.sales_channel_id }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.currency_code !== undefined && { currency_code: input.currency_code }),
        ...(input.metadata !== undefined && { metadata: input.metadata }),
        updated_at: sql`now()`,
      })
      .where(and(eq(order.id, id), isNull(order.deleted_at)))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: "Order not found" })
    }

    return { order: updated }
  },

  async cancel(id: string) {
    const db = getDb()
    const [updated] = await db
      .update(order)
      .set({
        status: "canceled",
        canceled_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where(and(eq(order.id, id), isNull(order.deleted_at)))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: "Order not found" })
    }

    return { order: updated }
  },
}
