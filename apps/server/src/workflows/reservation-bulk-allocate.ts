/** Workflow: reservation.bulkAllocate — 批量分配库存（单事务，失败整批回滚） */
import type { AdminBulkCreateReservationsType } from "@my-store/validators"
import { createWorkflow, step } from "../lib/workflow"
import { reservationService } from "../services/reservation.service"

export const reservationBulkAllocateWorkflow = createWorkflow(
  "reservation-bulk-allocate",
  [
    step("allocate", async ({ input }: { input: AdminBulkCreateReservationsType }) => {
      return reservationService.bulkAllocate(input)
    }),
  ],
)
