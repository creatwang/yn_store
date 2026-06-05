import { and, count, desc, eq, isNull, sql } from "drizzle-orm"
import { generateId, getDb, reservationItem } from "@my-store/db"
import type {
  AdminBulkCreateReservationsType,
  AdminGetReservationsParamsType,
} from "@my-store/validators/admin-list-params"
import {
  applyDateRangeConditions,
  applyInArrayCondition,
  asDateRange,
  listLimitOffset,
} from "../lib/query-filters"
import { HTTPException } from "hono/http-exception"
import { runInTransaction } from "../lib/transaction"
import { reservationBulkAllocateWorkflow } from "../workflows/reservation-bulk-allocate"
import {
  adjustReservedQuantity,
  releaseReservations,
} from "./inventory-reservation.service"

export const reservationService = {
  async list(query: AdminGetReservationsParamsType) {
    const db = getDb()
    const { limit, offset } = listLimitOffset(query, { limit: 20, offset: 0 })
    const conditions = [isNull(reservationItem.deleted_at)]

    applyInArrayCondition(
      reservationItem.location_id,
      query.location_id,
      conditions,
    )
    applyInArrayCondition(
      reservationItem.inventory_item_id,
      query.inventory_item_id,
      conditions,
    )
    applyInArrayCondition(
      reservationItem.line_item_id,
      query.line_item_id,
      conditions,
    )
    applyInArrayCondition(
      reservationItem.created_by,
      query.created_by,
      conditions,
    )
    applyDateRangeConditions(
      reservationItem.created_at,
      asDateRange(query.created_at),
      conditions,
      sql,
    )
    applyDateRangeConditions(
      reservationItem.updated_at,
      asDateRange(query.updated_at),
      conditions,
      sql,
    )

    const where = and(...conditions)
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

    return {
      reservations: rows,
      count: Number(total),
      limit,
      offset,
    }
  },

  async getById(id: string) {
    const db = getDb()
    const [row] = await db
      .select()
      .from(reservationItem)
      .where(
        and(eq(reservationItem.id, id), isNull(reservationItem.deleted_at)),
      )
      .limit(1)
    if (!row) throw new HTTPException(404, { message: "未找到" })
    return {
      reservation: {
        ...row,
        inventory_item: { id: row.inventory_item_id },
      },
    }
  },

  async create(input: Record<string, unknown>) {
    const id = generateId("resitem")
    const quantity = Number(input.quantity ?? 0)
    const locationId = String(input.location_id)
    const inventoryItemId = String(input.inventory_item_id)

    const [created] = await runInTransaction(async (tx) => {
      const [row] = await tx
        .insert(reservationItem)
        .values({
          id,
          line_item_id: (input.line_item_id as string | null | undefined) ?? null,
          location_id: locationId,
          inventory_item_id: inventoryItemId,
          quantity: String(quantity),
          raw_quantity: { amount: quantity, precision: 0 },
          description: (input.description as string | null | undefined) ?? null,
          metadata: (input.metadata as Record<string, unknown> | null) ?? null,
          created_by: "admin",
          created_at: sql`now()`,
          updated_at: sql`now()`,
        })
        .returning()
      await adjustReservedQuantity(inventoryItemId, locationId, quantity, tx)
      return [row]
    })
    return { reservation: created }
  },

  async update(id: string, input: Record<string, unknown>) {
    const db = getDb()
    const patch: Record<string, unknown> = {
      updated_at: sql`now()`,
    }
    if (input.location_id != null) {
      patch.location_id = String(input.location_id)
    }
    if (input.quantity != null) {
      const quantity = Number(input.quantity)
      patch.quantity = String(quantity)
      patch.raw_quantity = { amount: quantity, precision: 0 }
    }
    if (input.description !== undefined) {
      patch.description = input.description as string | null
    }
    if (input.metadata !== undefined) {
      patch.metadata = input.metadata
    }

    const [updated] = await db
      .update(reservationItem)
      .set(patch)
      .where(
        and(eq(reservationItem.id, id), isNull(reservationItem.deleted_at)),
      )
      .returning()
    if (!updated) throw new HTTPException(404, { message: "未找到" })
    return { reservation: updated }
  },

  async delete(id: string) {
    await releaseReservations([id])
    return { id, deleted: true }
  },

  async bulkAllocate(input: AdminBulkCreateReservationsType) {
    const result = (await reservationBulkAllocateWorkflow.run(
      input,
    )) as { reservations?: (typeof reservationItem.$inferSelect)[] }

    const reservations = result.reservations ?? []
    return { reservations, count: reservations.length }
  },
}
