import { and, eq, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  orderChangeAction,
} from "@my-store/db"
import type { orderChange as orderChangeTable } from "@my-store/db"
import { HTTPException } from "hono/http-exception"

type OrderChangeRow = typeof orderChangeTable.$inferSelect

async function nextOrdering(changeId: string): Promise<number> {
  const db = getDb()
  const rows = await db
    .select({ ordering: orderChangeAction.ordering })
    .from(orderChangeAction)
    .where(eq(orderChangeAction.order_change_id, changeId))
  return rows.length
}

export async function addChangeOutboundItems(input: {
  change: OrderChangeRow
  items: { variant_id: string; quantity: number }[]
  claim_id?: string
  exchange_id?: string
}) {
  const db = getDb()
  const { change, items, claim_id, exchange_id } = input
  const baseOrdering = await nextOrdering(change.id)

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    await db.insert(orderChangeAction).values({
      id: generateId("ordchact"),
      order_id: change.order_id,
      order_change_id: change.id,
      ordering: baseOrdering + i,
      version: change.version,
      action: "ITEM_ADD",
      reference: "product_variant",
      reference_id: item.variant_id,
      claim_id: claim_id ?? null,
      exchange_id: exchange_id ?? null,
      details: { quantity: item.quantity },
      created_at: sql`now()`,
      updated_at: sql`now()`,
    })
  }
}

export async function updateChangeOutboundItem(
  changeId: string,
  actionId: string,
  payload: { quantity?: number },
) {
  const db = getDb()
  const [action] = await db
    .select()
    .from(orderChangeAction)
    .where(
      and(
        eq(orderChangeAction.id, actionId),
        eq(orderChangeAction.order_change_id, changeId),
        eq(orderChangeAction.action, "ITEM_ADD"),
      ),
    )
    .limit(1)

  if (!action) {
    throw new HTTPException(404, { message: "Outbound item action not found" })
  }

  const details = {
    ...((action.details as Record<string, unknown>) ?? {}),
    ...payload,
  }
  await db
    .update(orderChangeAction)
    .set({ details, updated_at: sql`now()` })
    .where(eq(orderChangeAction.id, actionId))
}

export async function removeChangeOutboundItem(
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
        eq(orderChangeAction.action, "ITEM_ADD"),
      ),
    )
    .limit(1)

  if (!action) {
    throw new HTTPException(404, { message: "Outbound item action not found" })
  }

  await db.delete(orderChangeAction).where(eq(orderChangeAction.id, actionId))
}

export async function addChangeInboundReturnItems(input: {
  change: OrderChangeRow
  items: { item_id: string; quantity: number; note?: string; reason_id?: string }[]
  exchange_id?: string
  claim_id?: string
}) {
  const db = getDb()
  const { change, items, exchange_id, claim_id } = input
  const baseOrdering = await nextOrdering(change.id)
  const returnId = change.return_id ?? null

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    await db.insert(orderChangeAction).values({
      id: generateId("ordchact"),
      order_id: change.order_id,
      order_change_id: change.id,
      ordering: baseOrdering + i,
      version: change.version,
      action: "RETURN_ITEM",
      reference: "order_item",
      reference_id: item.item_id,
      return_id: returnId,
      claim_id: claim_id ?? null,
      exchange_id: exchange_id ?? null,
      details: {
        quantity: item.quantity,
        ...(item.reason_id ? { reason_id: item.reason_id } : {}),
      },
      created_at: sql`now()`,
      updated_at: sql`now()`,
    })
  }
}

export async function updateChangeInboundReturnItem(
  changeId: string,
  actionId: string,
  payload: { quantity?: number; note?: string; reason_id?: string },
) {
  const db = getDb()
  const [action] = await db
    .select()
    .from(orderChangeAction)
    .where(
      and(
        eq(orderChangeAction.id, actionId),
        eq(orderChangeAction.order_change_id, changeId),
        eq(orderChangeAction.action, "RETURN_ITEM"),
      ),
    )
    .limit(1)

  if (!action) {
    throw new HTTPException(404, { message: "Inbound item action not found" })
  }

  const details = {
    ...((action.details as Record<string, unknown>) ?? {}),
    ...(payload.quantity !== undefined ? { quantity: payload.quantity } : {}),
    ...(payload.reason_id !== undefined
      ? { reason_id: payload.reason_id }
      : {}),
    ...(payload.note !== undefined ? { note: payload.note } : {}),
  }
  await db
    .update(orderChangeAction)
    .set({ details, updated_at: sql`now()` })
    .where(eq(orderChangeAction.id, actionId))
}

export async function removeChangeInboundReturnItem(
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
        eq(orderChangeAction.action, "RETURN_ITEM"),
      ),
    )
    .limit(1)

  if (!action) {
    throw new HTTPException(404, { message: "Inbound item action not found" })
  }

  await db.delete(orderChangeAction).where(eq(orderChangeAction.id, actionId))
}
