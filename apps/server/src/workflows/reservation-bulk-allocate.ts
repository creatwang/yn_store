/** Workflow: reservation.bulk-allocate — 订单行批量分配库存（失败回滚软删） */
import { inArray, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  reservationItem,
} from "@my-store/db"
import type { AdminBulkCreateReservationsType } from "@my-store/validators/admin-list-params"
import { createWorkflow, step } from "../lib/workflow"
import { runInTransaction } from "../lib/transaction"
import { providers } from "../lib/providers"

export const reservationBulkAllocateWorkflow = createWorkflow(
  "reservation-bulk-allocate",
  [
    step(
      "allocate",
      async ({ input }) => {
        const payload = input as AdminBulkCreateReservationsType
        return runInTransaction(async (tx) => {
          const created: (typeof reservationItem.$inferSelect)[] = []

          for (const item of payload.items) {
            const id = generateId("resitem")
            const [row] = await tx
              .insert(reservationItem)
              .values({
                id,
                line_item_id: item.line_item_id,
                location_id: payload.location_id,
                inventory_item_id: item.inventory_item_id,
                quantity: String(item.quantity),
                raw_quantity: { amount: item.quantity, precision: 0 },
                description: item.description ?? null,
                metadata: item.metadata ?? null,
                created_by: "admin",
                created_at: sql`now()`,
                updated_at: sql`now()`,
              })
              .returning()
            if (row) created.push(row)
          }

          return {
            reservations: created,
            reservationIds: created.map((r) => r.id),
          }
        })
      },
      async ({ output }) => {
        const ids =
          (output.allocate as { reservationIds?: string[] } | undefined)
            ?.reservationIds ?? []
        if (ids.length === 0) return

        const db = getDb()
        await db
          .update(reservationItem)
          .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
          .where(inArray(reservationItem.id, ids))
      },
    ),
  ],
  { providers },
)
