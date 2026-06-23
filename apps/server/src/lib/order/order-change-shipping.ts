import { and, eq, isNull, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  orderChange,
  orderChangeAction,
} from "@my-store/db"
import type { orderChange as orderChangeTable } from "@my-store/db"
import { HTTPException } from "hono/http-exception"

type OrderChangeRow = typeof orderChangeTable.$inferSelect

async function getPendingChange(
  field: "claim_id" | "exchange_id" | "return_id",
  id: string,
): Promise<OrderChangeRow> {
  const db = getDb()
  const [change] = await db
    .select()
    .from(orderChange)
    .where(
      and(
        eq(orderChange[field], id),
        isNull(orderChange.canceled_at),
        eq(orderChange.status, "pending"),
      ),
    )
    .limit(1)

  if (!change) {
    throw new HTTPException(404, {
      message: `Pending order change not found for ${field}=${id}`,
    })
  }
  return change
}

export const getPendingChangeByClaimId = (claimId: string) =>
  getPendingChange("claim_id", claimId)

export const getPendingChangeByExchangeId = (exchangeId: string) =>
  getPendingChange("exchange_id", exchangeId)

export const getPendingChangeByReturnId = (returnId: string) =>
  getPendingChange("return_id", returnId)

async function nextOrdering(changeId: string): Promise<number> {
  const db = getDb()
  const rows = await db
    .select({ ordering: orderChangeAction.ordering })
    .from(orderChangeAction)
    .where(eq(orderChangeAction.order_change_id, changeId))
  return rows.length
}

export async function addChangeShippingAction(input: {
  change: OrderChangeRow
  shipping_option_id: string
  isInbound: boolean
  claim_id?: string
  exchange_id?: string
}) {
  const db = getDb()
  const { change, shipping_option_id, isInbound, claim_id, exchange_id } =
    input
  const returnId =
    isInbound && change.return_id ? change.return_id : null

  await db.insert(orderChangeAction).values({
    id: generateId("ordchact"),
    order_id: change.order_id,
    order_change_id: change.id,
    ordering: await nextOrdering(change.id),
    version: change.version,
    action: "SHIPPING_ADD",
    reference: "shipping_option",
    reference_id: shipping_option_id,
    return_id: returnId,
    claim_id: claim_id ?? null,
    exchange_id: exchange_id ?? null,
    details: { is_inbound: isInbound },
    created_at: sql`now()`,
    updated_at: sql`now()`,
  })
}

export async function updateChangeShippingAction(
  changeId: string,
  actionId: string,
  payload: { shipping_option_id?: string },
) {
  const db = getDb()
  const [action] = await db
    .select()
    .from(orderChangeAction)
    .where(
      and(
        eq(orderChangeAction.id, actionId),
        eq(orderChangeAction.order_change_id, changeId),
        eq(orderChangeAction.action, "SHIPPING_ADD"),
      ),
    )
    .limit(1)

  if (!action) {
    throw new HTTPException(404, { message: "Shipping action not found" })
  }

  await db
    .update(orderChangeAction)
    .set({
      ...(payload.shipping_option_id
        ? { reference_id: payload.shipping_option_id }
        : {}),
      updated_at: sql`now()`,
    })
    .where(eq(orderChangeAction.id, actionId))
}

export async function removeChangeShippingAction(
  changeId: string,
  actionId: string,
) {
  const db = getDb()
  const [action] = await db
    .select({ id: orderChangeAction.id })
    .from(orderChangeAction)
    .where(
      and(
        eq(orderChangeAction.id, actionId),
        eq(orderChangeAction.order_change_id, changeId),
        eq(orderChangeAction.action, "SHIPPING_ADD"),
      ),
    )
    .limit(1)

  if (!action) {
    throw new HTTPException(404, { message: "Shipping action not found" })
  }

  await db.delete(orderChangeAction).where(eq(orderChangeAction.id, actionId))
}
