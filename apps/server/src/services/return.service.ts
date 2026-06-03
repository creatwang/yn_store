import { and, count, desc, eq, isNull, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  orderReturn,
  returnItem,
  orderItem,
  orderChange,
} from "@my-store/db"
import type {
  CreateReturnInput,
  ReceiveReturnInput,
} from "@my-store/validators"
import type { AdminListReturnsParamsType } from "@my-store/validators/admin-list-params"
import {
  applyDateRangeConditions,
  applyInArrayCondition,
  listLimitOffset,
} from "../lib/query-filters"
import { HTTPException } from "hono/http-exception"
import { eventBus } from "../lib/events"
import { returnCreateWorkflow } from "../workflows/return-create"
import { runInTransaction } from "../lib/transaction"
import {
  addChangeShippingAction,
  getPendingChangeByReturnId,
  removeChangeShippingAction,
  updateChangeShippingAction,
} from "../lib/order-change-shipping"
import { notifyReturnRequested } from "../lib/notify-customer"

type ReturnItemInput = {
  item_id: string
  quantity: number
  note?: string | null
  reason_id?: string | null
}

function resolveShippingOptionId(input: Record<string, unknown>) {
  const id = input.shipping_option_id ?? input.option_id
  if (id == null || String(id).trim() === "") {
    throw new HTTPException(400, { message: "shipping_option_id is required" })
  }
  return String(id)
}

export const returnService = {
  async list(query: AdminListReturnsParamsType) {
    const db = getDb()
    const { limit, offset } = listLimitOffset(query, { limit: 15, offset: 0 })
    const conditions = [isNull(orderReturn.deleted_at)]

    applyInArrayCondition(orderReturn.id, query.id, conditions)
    applyInArrayCondition(orderReturn.status, query.status, conditions)
    applyInArrayCondition(orderReturn.order_id, query.order_id, conditions)
    applyDateRangeConditions(
      orderReturn.created_at,
      query.created_at,
      conditions,
      sql,
    )
    applyDateRangeConditions(
      orderReturn.updated_at,
      query.updated_at,
      conditions,
      sql,
    )

    const [returns, [{ total }]] = await Promise.all([
      db
        .select()
        .from(orderReturn)
        .where(and(...conditions))
        .orderBy(desc(orderReturn.created_at))
        .limit(limit)
        .offset(offset),
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

    const items = await db.select().from(returnItem).where(eq(returnItem.return_id, id))

    return { return: { ...ret, items } }
  },

  async create(input: CreateReturnInput) {
    const result = await returnCreateWorkflow.run({
      order_id: input.order_id, order_version: input.order_version,
      location_id: input.location_id ?? undefined, refund_amount: input.refund_amount,
      items: input.items ?? [],
    })
    const returnId = (result as { returnId?: string } | undefined)?.returnId
    if (!returnId) {
      throw new HTTPException(500, { message: "Return creation failed" })
    }
    return this.getById(String(returnId))
  },

  async addReturnItems(returnId: string, orderId: string, items: ReturnItemInput[]) {
    await runInTransaction(async (tx) => {
      for (const item of items) {
        const riId = generateId("retitm")
        await tx.insert(returnItem).values({
          id: riId,
          return_id: returnId,
          item_id: item.item_id,
          quantity: String(item.quantity),
          raw_quantity: { amount: item.quantity, precision: 0 },
          note: item.note ?? null,
        })

        await tx
          .update(orderItem)
          .set({
            return_requested_quantity: sql`COALESCE(return_requested_quantity::numeric, 0) + ${item.quantity}`,
          })
          .where(
            and(eq(orderItem.item_id, item.item_id), eq(orderItem.order_id, orderId)),
          )
      }
    })

    return this.getById(returnId)
  },

  async updateReturnItem(returnId: string, actionId: string, input: Partial<ReturnItemInput>) {
    const db = getDb()
    const [updated] = await db
      .update(returnItem)
      .set({
        ...(input.quantity !== undefined
          ? {
              quantity: String(input.quantity),
              raw_quantity: { amount: input.quantity, precision: 0 },
            }
          : {}),
        note: input.note ?? undefined,
      })
      .where(and(eq(returnItem.id, actionId), eq(returnItem.return_id, returnId)))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: "Return item not found" })
    }

    return this.getById(returnId)
  },

  async removeReturnItem(returnId: string, actionId: string) {
    const db = getDb()
    await db
      .delete(returnItem)
      .where(and(eq(returnItem.id, actionId), eq(returnItem.return_id, returnId)))
    return this.getById(returnId)
  },

  async updateRequest(id: string, input: Record<string, unknown>) {
    const db = getDb()
    const [updated] = await db
      .update(orderReturn)
      .set({
        location_id: (input.location_id as string) ?? undefined,
        metadata: input.metadata as Record<string, unknown> | undefined,
        updated_at: sql`now()`,
      })
      .where(and(eq(orderReturn.id, id), isNull(orderReturn.deleted_at)))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: "Return not found" })
    }

    return this.getById(id)
  },

  async confirmRequest(
    id: string,
    input?: { no_notification?: boolean },
  ) {
    const db = getDb()
    const current = await this.getById(id)
    const [updated] = await db
      .update(orderReturn)
      .set({
        status: "requested",
        requested_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where(and(eq(orderReturn.id, id), isNull(orderReturn.deleted_at)))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: "Return not found" })
    }

    await notifyReturnRequested(
      id,
      current.return.order_id,
      input?.no_notification,
    )

    return this.getById(id)
  },

  async cancelRequest(id: string) {
    const db = getDb()
    const [updated] = await db
      .update(orderReturn)
      .set({
        status: "open",
        requested_at: null,
        updated_at: sql`now()`,
      })
      .where(and(eq(orderReturn.id, id), isNull(orderReturn.deleted_at)))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: "Return not found" })
    }

    return this.getById(id)
  },

  async addReturnShipping(id: string, input: Record<string, unknown>) {
    const change = await getPendingChangeByReturnId(id)
    await addChangeShippingAction({
      change,
      shipping_option_id: resolveShippingOptionId(input),
      isInbound: true,
    })
    return this.getById(id)
  },

  async updateReturnShipping(
    id: string,
    actionId: string,
    input: Record<string, unknown>,
  ) {
    const change = await getPendingChangeByReturnId(id)
    const patch: { shipping_option_id?: string } = {}
    if (input.shipping_option_id != null) {
      patch.shipping_option_id = String(input.shipping_option_id)
    } else if (input.option_id != null) {
      patch.shipping_option_id = String(input.option_id)
    }
    await updateChangeShippingAction(change.id, actionId, patch)
    return this.getById(id)
  },

  async deleteReturnShipping(id: string, actionId: string) {
    const change = await getPendingChangeByReturnId(id)
    await removeChangeShippingAction(change.id, actionId)
    return this.getById(id)
  },

  async dismissItems(id: string, input: ReceiveReturnInput) {
    const db = getDb()
    const current = await this.getById(id)
    const ret = current.return

    if (input.items?.length) {
      for (const item of input.items) {
        const qty = item.received_quantity ?? item.quantity
        await db
          .update(orderItem)
          .set({
            return_dismissed_quantity: sql`COALESCE(return_dismissed_quantity::numeric, 0) + ${qty}`,
          })
          .where(
            and(
              eq(orderItem.item_id, item.item_id),
              eq(orderItem.order_id, ret.order_id),
            ),
          )
      }
    }

    return this.getById(id)
  },

  async receiveItems(id: string, input: ReceiveReturnInput) {
    const db = getDb()
    const current = await this.getById(id)
    const ret = current.return

    if (input.items?.length) {
      for (const item of input.items) {
        await db
          .update(returnItem)
          .set({
            received_quantity: String(item.received_quantity ?? item.quantity),
            damaged_quantity: item.damaged_quantity ? String(item.damaged_quantity) : "0",
          })
          .where(and(eq(returnItem.return_id, id), eq(returnItem.item_id, item.item_id)))

        await db
          .update(orderItem)
          .set({
            return_received_quantity: sql`COALESCE(return_received_quantity::numeric, 0) + ${item.received_quantity ?? item.quantity}`,
          })
          .where(and(eq(orderItem.item_id, item.item_id), eq(orderItem.order_id, ret.order_id)))
      }
    }

    await db
      .update(orderReturn)
      .set({ status: "partially_received", updated_at: sql`now()` })
      .where(eq(orderReturn.id, id))

    return this.getById(id)
  },

  async initiateReceive(id: string, _input?: ReceiveReturnInput) {
    const db = getDb()
    await db
      .update(orderChange)
      .set({ change_type: "return_receive", updated_at: sql`now()` })
      .where(
        and(
          eq(orderChange.return_id, id),
          isNull(orderChange.confirmed_at),
          isNull(orderChange.canceled_at),
        ),
      )
    return this.getById(id)
  },

  async confirmReceive(id: string, input: ReceiveReturnInput) {
    return this.receive(id, input)
  },

  async cancelReceive(id: string) {
    const db = getDb()
    const [updated] = await db
      .update(orderReturn)
      .set({ status: "requested", updated_at: sql`now()` })
      .where(and(eq(orderReturn.id, id), isNull(orderReturn.deleted_at)))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: "Return not found" })
    }

    return this.getById(id)
  },

  async receive(id: string, input: ReceiveReturnInput) {
    const current = await this.getById(id)
    const ret = current.return

    await runInTransaction(async (tx) => {
      if (input.items?.length) {
        for (const item of input.items) {
          await tx
            .update(returnItem)
            .set({
              received_quantity: String(item.received_quantity ?? item.quantity),
              damaged_quantity: item.damaged_quantity
                ? String(item.damaged_quantity)
                : "0",
            })
            .where(
              and(eq(returnItem.return_id, id), eq(returnItem.item_id, item.item_id)),
            )

          await tx
            .update(orderItem)
            .set({
              return_received_quantity: sql`COALESCE(return_received_quantity::numeric, 0) + ${item.received_quantity ?? item.quantity}`,
            })
            .where(
              and(
                eq(orderItem.item_id, item.item_id),
                eq(orderItem.order_id, ret.order_id),
              ),
            )
        }
      }

      const [updated] = await tx
        .update(orderReturn)
        .set({
          status: "received",
          received_at: sql`now()`,
          updated_at: sql`now()`,
        })
        .where(and(eq(orderReturn.id, id), isNull(orderReturn.deleted_at)))
        .returning()

      if (!updated) {
        throw new HTTPException(404, { message: "Return not found" })
      }
    })

    await eventBus.emit("return.received", {
      return_id: id,
      order_id: ret.order_id,
    })

    return this.getById(id)
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
