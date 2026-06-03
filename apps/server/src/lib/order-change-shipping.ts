import { and, asc, eq, isNull, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  orderChange,
  orderChangeAction,
} from "@my-store/db"
import { HTTPException } from "hono/http-exception"

type ChangeRow = typeof orderChange.$inferSelect

async function nextOrdering(changeId: string) {
  const db = getDb()
  const rows = await db
    .select({ ordering: orderChangeAction.ordering })
    .from(orderChangeAction)
    .where(eq(orderChangeAction.order_change_id, changeId))
    .orderBy(asc(orderChangeAction.ordering))
  const max = rows.reduce((m, r) => Math.max(m, r.ordering ?? 0), -1)
  return max + 1
}

export async function getPendingChangeByClaimId(
  claimId: string,
): Promise<ChangeRow> {
  const db = getDb()
  const [change] = await db
    .select()
    .from(orderChange)
    .where(
      and(eq(orderChange.claim_id, claimId), isNull(orderChange.canceled_at)),
    )
    .limit(1)
  if (!change) {
    throw new HTTPException(404, { message: "Claim order change not found" })
  }
  return change
}

export async function getPendingChangeByExchangeId(
  exchangeId: string,
): Promise<ChangeRow> {
  const db = getDb()
  const [change] = await db
    .select()
    .from(orderChange)
    .where(
      and(
        eq(orderChange.exchange_id, exchangeId),
        isNull(orderChange.canceled_at),
      ),
    )
    .limit(1)
  if (!change) {
    throw new HTTPException(404, { message: "Exchange order change not found" })
  }
  return change
}

export async function addChangeShippingAction(input: {
  change: ChangeRow
  shipping_option_id: string
  isInbound: boolean
  claim_id?: string | null
  exchange_id?: string | null
  amount?: number
  name?: string
}) {
  const db = getDb()
  const { change } = input
  const ordering = await nextOrdering(change.id)
  const amount =
    input.amount != null ? String(input.amount) : null
  const id = generateId("ordchact")

  await db.insert(orderChangeAction).values({
    id,
    order_id: change.order_id,
    order_change_id: change.id,
    return_id: input.isInbound ? change.return_id : null,
    claim_id: input.claim_id ?? null,
    exchange_id: input.exchange_id ?? null,
    ordering,
    version: change.version,
    action: "SHIPPING_ADD",
    reference: "shipping_option",
    reference_id: input.shipping_option_id,
    details: {
      name: input.name,
      amount: input.amount,
      is_inbound: input.isInbound,
    },
    amount,
    raw_amount: amount ? { value: amount, precision: 20 } : null,
    created_at: sql`now()`,
    updated_at: sql`now()`,
  })

  return id
}

export async function updateChangeShippingAction(
  changeId: string,
  actionId: string,
  payload: { shipping_option_id?: string; amount?: number; name?: string },
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

  const details = {
    ...((action.details as Record<string, unknown>) ?? {}),
    ...(payload.name != null ? { name: payload.name } : {}),
    ...(payload.amount != null ? { amount: payload.amount } : {}),
  }
  const amount =
    payload.amount != null ? String(payload.amount) : action.amount

  await db
    .update(orderChangeAction)
    .set({
      reference_id: payload.shipping_option_id ?? action.reference_id,
      details,
      amount,
      raw_amount: amount ? { value: amount, precision: 20 } : null,
      updated_at: sql`now()`,
    })
    .where(eq(orderChangeAction.id, actionId))
}

export async function removeChangeShippingAction(
  changeId: string,
  actionId: string,
) {
  const db = getDb()
  const result = await db
    .delete(orderChangeAction)
    .where(
      and(
        eq(orderChangeAction.id, actionId),
        eq(orderChangeAction.order_change_id, changeId),
        eq(orderChangeAction.action, "SHIPPING_ADD"),
      ),
    )
    .returning({ id: orderChangeAction.id })
  if (!result.length) {
    throw new HTTPException(404, { message: "Shipping action not found" })
  }
}

export async function listShippingActionsForChange(changeId: string) {
  const db = getDb()
  return db
    .select()
    .from(orderChangeAction)
    .where(
      and(
        eq(orderChangeAction.order_change_id, changeId),
        eq(orderChangeAction.action, "SHIPPING_ADD"),
      ),
    )
    .orderBy(asc(orderChangeAction.ordering))
}
