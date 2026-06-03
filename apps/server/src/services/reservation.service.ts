import { and, count, desc, eq, isNull, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  inventoryLevel,
  reservationItem,
} from "@my-store/db"
import type {
  AdminBulkCreateReservationsType,
  AdminCreateReservationType,
} from "@my-store/validators"
import type { AdminGetReservationsParamsType } from "@my-store/validators/admin-list-params"
import { HTTPException } from "hono/http-exception"
import { listLimitOffset } from "../lib/query-filters"
import { runInTransaction, type DbTx } from "../lib/transaction"

async function adjustReservedQuantity(
  tx: DbTx,
  input: {
    inventory_item_id: string
    location_id: string
    delta: number
  },
) {
  const [level] = await tx
    .select()
    .from(inventoryLevel)
    .where(
      and(
        eq(inventoryLevel.inventory_item_id, input.inventory_item_id),
        eq(inventoryLevel.location_id, input.location_id),
      ),
    )
    .limit(1)

  if (!level) {
    throw new HTTPException(400, {
      message: "Inventory level not found for location",
    })
  }

  const stocked = Number(level.stocked_quantity ?? 0)
  const reserved = Number(level.reserved_quantity ?? 0)
  const next = reserved + input.delta
  if (next < 0 || next > stocked) {
    throw new HTTPException(400, {
      message: "Insufficient inventory to reserve",
    })
  }

  await tx
    .update(inventoryLevel)
    .set({
      reserved_quantity: String(next),
      raw_reserved_quantity: { amount: next, precision: 0 },
    })
    .where(eq(inventoryLevel.id, level.id))
}

async function createReservationInTx(
  tx: DbTx,
  input: AdminCreateReservationType,
) {
  const id = generateId("res")
  const qty = input.quantity
  const [created] = await tx
    .insert(reservationItem)
    .values({
      id,
      line_item_id: input.line_item_id ?? null,
      location_id: input.location_id,
      inventory_item_id: input.inventory_item_id,
      quantity: String(qty),
      raw_quantity: { amount: qty, precision: 0 },
      description: input.description ?? null,
      metadata: input.metadata ?? null,
      created_by: "admin",
      created_at: sql`now()`,
      updated_at: sql`now()`,
    })
    .returning()

  await adjustReservedQuantity(tx, {
    inventory_item_id: input.inventory_item_id,
    location_id: input.location_id,
    delta: qty,
  })

  return created
}

export const reservationService = {
  async list(query: AdminGetReservationsParamsType) {
    const db = getDb()
    const { limit, offset } = listLimitOffset(query, { limit: 50, offset: 0 })
    const where = isNull(reservationItem.deleted_at)
    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(reservationItem)
        .where(where)
        .orderBy(desc(reservationItem.created_at))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(reservationItem).where(where),
    ])
    return { reservations: rows, count: Number(total), limit, offset }
  },

  async getById(id: string) {
    const db = getDb()
    const [item] = await db
      .select()
      .from(reservationItem)
      .where(and(eq(reservationItem.id, id), isNull(reservationItem.deleted_at)))
      .limit(1)
    if (!item) throw new HTTPException(404, { message: "未找到" })
    return { reservation: item }
  },

  async create(input: AdminCreateReservationType) {
    const created = await runInTransaction((tx) => createReservationInTx(tx, input))
    return { reservation: created }
  },

  async update(id: string, input: Record<string, unknown>) {
    const db = getDb()
    const [updated] = await db
      .update(reservationItem)
      .set({ ...input, updated_at: sql`now()` })
      .where(and(eq(reservationItem.id, id), isNull(reservationItem.deleted_at)))
      .returning()
    if (!updated) throw new HTTPException(404, { message: "未找到" })
    return { reservation: updated }
  },

  async delete(id: string) {
    const db = getDb()
    const [existing] = await db
      .select()
      .from(reservationItem)
      .where(and(eq(reservationItem.id, id), isNull(reservationItem.deleted_at)))
      .limit(1)
    if (!existing) throw new HTTPException(404, { message: "未找到" })

    await runInTransaction(async (tx) => {
      await adjustReservedQuantity(tx, {
        inventory_item_id: existing.inventory_item_id,
        location_id: existing.location_id,
        delta: -Number(existing.quantity),
      })
      await tx
        .update(reservationItem)
        .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
        .where(eq(reservationItem.id, id))
    })

    return { id, deleted: true }
  },

  async bulkAllocate(input: AdminBulkCreateReservationsType) {
    const created = await runInTransaction(async (tx) => {
      const rows: typeof reservationItem.$inferSelect[] = []
      for (const row of input.items) {
        const item = await createReservationInTx(tx, {
          line_item_id: row.line_item_id,
          location_id: input.location_id,
          inventory_item_id: row.inventory_item_id,
          quantity: row.quantity,
          description: row.description ?? null,
          metadata: row.metadata ?? null,
        })
        rows.push(item)
      }
      return rows
    })
    return { reservations: created, count: created.length }
  },
}
