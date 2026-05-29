import { and, count, desc, eq, isNull, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  orderReturn,
  returnItem,
  returnReason,
  orderItem,
} from "@my-store/db"
import type {
  CreateReturnInput,
  ReceiveReturnInput,
  ListReturnsQuery,
} from "@my-store/validators"
import { HTTPException } from "hono/http-exception"

export const returnService = {
  async list(query: ListReturnsQuery) {
    const db = getDb()
    const conditions = [isNull(orderReturn.deleted_at)]

    if (query.status) {
      conditions.push(eq(orderReturn.status, query.status))
    }

    if (query.order_id) {
      conditions.push(eq(orderReturn.order_id, query.order_id))
    }

    const [returns, [{ total }]] = await Promise.all([
      db
        .select()
        .from(orderReturn)
        .where(and(...conditions))
        .orderBy(desc(orderReturn.created_at))
        .limit(query.limit)
        .offset(query.offset),
      db.select({ total: count() }).from(orderReturn).where(and(...conditions)),
    ])

    return { returns, count: Number(total) }
  },

  async getById(id: string) {
    const db = getDb()
    const [ret] = await db
      .select()
      .from(orderReturn)
      .where(and(eq(orderReturn.id, id), isNull(orderReturn.deleted_at)))
      .limit(1)

    if (!ret) {
      throw new HTTPException(404, { message: "Return not found" })
    }

    const items = await db
      .select()
      .from(returnItem)
      .where(eq(returnItem.return_id, id))

    return { return: { ...ret, items } }
  },

  async create(input: CreateReturnInput) {
    const db = getDb()
    const id = generateId("ret")

    const [created] = await db
      .insert(orderReturn)
      .values({
        id,
        order_id: input.order_id,
        order_version: input.order_version ?? 1,
        location_id: input.location_id ?? null,
        refund_amount: input.refund_amount ? String(input.refund_amount) : null,
        raw_refund_amount: input.refund_amount ? { amount: input.refund_amount, precision: 2 } : null,
        created_by: "admin",
        status: "open",
      })
      .returning()

    // Create return items
    if (input.items?.length) {
      for (const item of input.items) {
        const riId = generateId("retitm")
        await db.insert(returnItem).values({
          id: riId,
          return_id: id,
          item_id: item.item_id,
          quantity: String(item.quantity),
          raw_quantity: { amount: item.quantity, precision: 0 },
          note: item.note ?? null,
        })

        // Update order_item return_requested_quantity
        await db
          .update(orderItem)
          .set({
            return_requested_quantity: sql`COALESCE(return_requested_quantity::numeric, 0) + ${item.quantity}`,
          })
          .where(and(
            eq(orderItem.item_id, item.item_id),
            eq(orderItem.order_id, input.order_id),
          ))
      }
    }

    return this.getById(id)
  },

  async receive(id: string, input: ReceiveReturnInput) {
    const db = getDb()

    const [ret] = await db
      .select()
      .from(orderReturn)
      .where(and(eq(orderReturn.id, id), isNull(orderReturn.deleted_at)))
      .limit(1)

    if (!ret) {
      throw new HTTPException(404, { message: "Return not found" })
    }

    // Update received quantities for each item
    if (input.items?.length) {
      for (const item of input.items) {
        await db
          .update(returnItem)
          .set({
            received_quantity: String(item.received_quantity ?? item.quantity),
            damaged_quantity: item.damaged_quantity ? String(item.damaged_quantity) : "0",
          })
          .where(and(
            eq(returnItem.return_id, id),
            eq(returnItem.item_id, item.item_id),
          ))

        // Update order_item return_received_quantity
        await db
          .update(orderItem)
          .set({
            return_received_quantity: sql`COALESCE(return_received_quantity::numeric, 0) + ${item.received_quantity ?? item.quantity}`,
          })
          .where(and(
            eq(orderItem.item_id, item.item_id),
            eq(orderItem.order_id, ret.order_id),
          ))
      }
    }

    // Mark return as received
    const [updated] = await db
      .update(orderReturn)
      .set({
        status: "received",
        received_at: sql`now()`,
      })
      .where(eq(orderReturn.id, id))
      .returning()

    return { return: updated }
  },

  async cancel(id: string) {
    const db = getDb()
    const [updated] = await db
      .update(orderReturn)
      .set({
        status: "canceled",
        canceled_at: sql`now()`,
      })
      .where(and(eq(orderReturn.id, id), isNull(orderReturn.deleted_at)))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: "Return not found" })
    }

    return { return: updated }
  },
}
