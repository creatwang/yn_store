/**
 * 草稿订单编辑 preview — 对齐官方 draft_order_preview / GET orders/:id/preview
 */
import { and, asc, eq, isNull } from "drizzle-orm"
import { getDb, order, orderChange, orderChangeAction } from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import { presentAdminOrderDetail } from "./admin-order"
import { buildAdminOrderPreview } from "./admin-order-preview"

type Db = ReturnType<typeof getDb>

import { DEFAULT_ADMIN_DRAFT_ORDER_RETRIEVE_FIELDS } from "./draft-order-fields"

const DRAFT_PREVIEW_FIELDS = `${DEFAULT_ADMIN_DRAFT_ORDER_RETRIEVE_FIELDS},*order_change,+order_change.actions`

function mapChangeAction(row: typeof orderChangeAction.$inferSelect) {
  return {
    id: row.id,
    order_id: row.order_id,
    order_change_id: row.order_change_id,
    action: row.action,
    reference: row.reference,
    reference_id: row.reference_id,
    details: row.details ?? {},
    amount: row.amount != null ? Number(row.amount) : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

async function loadDraftEditChange(db: Db, orderId: string) {
  const [change] = await db
    .select()
    .from(orderChange)
    .where(
      and(
        eq(orderChange.order_id, orderId),
        eq(orderChange.change_type, "draft_edit"),
        isNull(orderChange.canceled_at),
        isNull(orderChange.confirmed_at),
      ),
    )
    .limit(1)

  return change ?? null
}

async function loadDraftEditActions(db: Db, changeId: string) {
  return db
    .select()
    .from(orderChangeAction)
    .where(eq(orderChangeAction.order_change_id, changeId))
    .orderBy(asc(orderChangeAction.ordering))
}

/** 官方 mutation 响应 + useOrderPreview 共用 */
export async function buildDraftOrderEditPreview(orderId: string) {
  const db = getDb() as Db

  const [ord] = await db
    .select()
    .from(order)
    .where(
      and(
        eq(order.id, orderId),
        eq(order.is_draft_order, true),
        isNull(order.deleted_at),
      ),
    )
    .limit(1)

  if (!ord) {
    throw new HTTPException(404, { message: "Draft order not found" })
  }

  const activeChange = await loadDraftEditChange(db, orderId)
  const base = (await presentAdminOrderDetail(db, ord, DRAFT_PREVIEW_FIELDS)) as Record<
    string,
    unknown
  > & { items?: Record<string, unknown>[] }

  if (!activeChange) {
    return {
      draft_order_preview: {
        order: {
          ...base,
          order_change: null,
        },
      },
    }
  }

  const actionRows = await loadDraftEditActions(db, activeChange.id)
  const changeActions = actionRows.map(mapChangeAction)

  const items = ((base.items ?? []) as Record<string, unknown>[]).map(
    (item) => {
      const lineId = item.id as string
      const itemActions = changeActions.filter(
        (a) =>
          a.reference_id === lineId &&
          (a.action === "ITEM_ADD" || a.action === "ITEM_UPDATE"),
      )
      return {
        ...item,
        actions: itemActions.length ? itemActions : [],
      }
    },
  )

  const orderChangeDto = {
    ...activeChange,
    status: activeChange.status ?? "pending",
    actions: changeActions,
  }

  const pendingAddCodes = changeActions
    .filter((a) => a.action === "PROMOTION_ADD")
    .map((a) => (a.details as { code?: string })?.code)
    .filter((code): code is string => Boolean(code))

  const pendingRemoveCodes = new Set(
    changeActions
      .filter((a) => a.action === "PROMOTION_REMOVE")
      .map((a) => (a.details as { code?: string })?.code)
      .filter((code): code is string => Boolean(code)),
  )

  const basePromos = (
    (base.promotions as { code?: string; id?: string }[]) ?? []
  ).filter((p) => !p.code || !pendingRemoveCodes.has(p.code))

  const mergedPromotions = [
    ...basePromos,
    ...pendingAddCodes
      .filter(
        (code) => !basePromos.some((bp) => bp.code === code),
      )
      .map((code) => ({ code, id: code })),
  ]

  return {
    draft_order_preview: {
      order: {
        ...base,
        items,
        promotions: mergedPromotions,
        order_change: orderChangeDto,
      },
    },
  }
}

/** GET /admin/orders/:id/preview — 草稿单走编辑 preview */
export async function buildOrderPreviewForDraftOrRma(orderId: string) {
  const db = getDb() as Db
  const [ord] = await db
    .select()
    .from(order)
    .where(and(eq(order.id, orderId), isNull(order.deleted_at)))
    .limit(1)

  if (!ord) {
    throw new HTTPException(404, { message: "Order not found" })
  }

  if (ord.is_draft_order) {
    const { draft_order_preview } = await buildDraftOrderEditPreview(orderId)
    return { order: draft_order_preview.order }
  }

  return buildAdminOrderPreview(orderId)
}
