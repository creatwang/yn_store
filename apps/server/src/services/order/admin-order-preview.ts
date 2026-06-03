/**
 * Admin 订单 Preview DTO — RMA 向导（退货/换货/索赔）依赖
 */
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import {
  generateId,
  getDb,
  order,
  orderChange,
  orderChangeAction,
  orderClaim,
  orderClaimItem,
  orderExchange,
  orderReturn,
  product,
  productVariant,
  returnItem,
} from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import { toAmount } from "../../lib/big-number"
import { decorateOrderTotals, presentAdminOrderDetail } from "./admin-order"

type Db = ReturnType<typeof getDb>

type PreviewAction = {
  action: string
  id: string
  return_id?: string
  claim_id?: string
  exchange_id?: string
  internal_note?: string | null
  details?: Record<string, unknown>
}

function num(v: unknown): number {
  if (v == null) return 0
  return toAmount(v as string | number | { amount?: number })
}

function sqlRows(result: unknown): unknown[] {
  return Array.isArray(result) ? result : ((result as { rows?: unknown[] }).rows ?? [])
}

function mapEditChangeAction(row: typeof orderChangeAction.$inferSelect) {
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

async function loadOrderEditActions(db: Db, changeId: string) {
  return db
    .select()
    .from(orderChangeAction)
    .where(eq(orderChangeAction.order_change_id, changeId))
    .orderBy(asc(orderChangeAction.ordering))
}

async function loadVariantsForEditPreview(db: Db, variantIds: string[]) {
  const map = new Map<
    string,
    { title: string; sku: string | null; thumbnail: string | null; product_title: string | null }
  >()
  if (variantIds.length === 0) return map

  const rows = await db
    .select({
      id: productVariant.id,
      title: productVariant.title,
      sku: productVariant.sku,
      thumbnail: product.thumbnail,
      product_title: product.title,
    })
    .from(productVariant)
    .leftJoin(
      product,
      and(eq(product.id, productVariant.product_id), isNull(product.deleted_at)),
    )
    .where(
      and(inArray(productVariant.id, variantIds), isNull(productVariant.deleted_at)),
    )

  for (const row of rows) {
    map.set(row.id, {
      title: row.title ?? row.id,
      sku: row.sku ?? null,
      thumbnail: row.thumbnail ?? null,
      product_title: row.product_title ?? null,
    })
  }
  return map
}

async function loadVariantUnitPrices(
  db: Db,
  variantIds: string[],
  currencyCode: string,
) {
  const map = new Map<string, number>()
  if (variantIds.length === 0) return map

  const variantIdList = sql.join(
    variantIds.map((id) => sql`${id}`),
    sql`, `,
  )

  try {
    const rows = await db.execute(sql`
      SELECT pvps.variant_id, MIN(pr.amount)::numeric AS amount
      FROM product_variant_price_set pvps
      JOIN price_set ps ON ps.id = pvps.price_set_id
      JOIN price pr ON pr.price_set_id = ps.id
      WHERE pvps.variant_id IN (${variantIdList})
        AND pr.currency_code = ${currencyCode}
      GROUP BY pvps.variant_id
    `)
    for (const row of sqlRows(rows) as Array<Record<string, unknown>>) {
      map.set(String(row.variant_id), num(row.amount))
    }
  } catch {
    try {
      const rows = await db.execute(sql`
        SELECT variant_id, MIN(amount)::numeric AS amount
        FROM price
        WHERE variant_id IN (${variantIdList})
          AND currency_code = ${currencyCode}
        GROUP BY variant_id
      `)
      for (const row of sqlRows(rows) as Array<Record<string, unknown>>) {
        map.set(String(row.variant_id), num(row.amount))
      }
    } catch { /* no prices */ }
  }

  return map
}

/** 将 order edit 的 change actions 合并进 preview items（对齐官方 orders/:id/preview） */
async function applyOrderEditToPreview(
  db: Db,
  items: Record<string, unknown>[],
  activeChange: typeof orderChange.$inferSelect,
  currencyCode: string,
) {
  const actionRows = await loadOrderEditActions(db, activeChange.id)
  const changeActions = actionRows.map(mapEditChangeAction)

  for (const item of items) {
    const lineId = item.id as string
    const updates = changeActions.filter(
      (a) => a.reference_id === lineId && a.action === "ITEM_UPDATE",
    )
    if (!updates.length) continue

    item.actions = [...((item.actions as PreviewAction[]) ?? []), ...updates]
    const latest = updates[updates.length - 1]
    const newQty = num((latest.details as Record<string, unknown>)?.quantity)
    if (newQty <= 0) continue

    const oldQty = num(item.quantity) || 1
    const unitTotal = num(item.total) / oldQty
    item.quantity = newQty
    item.total = unitTotal * newQty
    item.subtotal = unitTotal * newQty
    item.detail = {
      ...(item.detail as object),
      quantity: newQty,
    }
  }

  const addActions = changeActions.filter((a) => a.action === "ITEM_ADD")
  const variantIds = addActions
    .map((a) => a.reference_id)
    .filter((id): id is string => Boolean(id))
  const variantMap = await loadVariantsForEditPreview(db, variantIds)
  const priceMap = await loadVariantUnitPrices(db, variantIds, currencyCode)

  for (const action of addActions) {
    const variantId = action.reference_id!
    const info = variantMap.get(variantId)
    const qty = num((action.details as Record<string, unknown>)?.quantity) || 1
    const unitPrice =
      action.amount != null ? num(action.amount) : (priceMap.get(variantId) ?? 0)

    items.push({
      id: action.id,
      variant_id: variantId,
      title: info?.title ?? variantId,
      product_title: info?.product_title ?? info?.title ?? variantId,
      variant_sku: info?.sku ?? "",
      subtitle: info?.title ?? "",
      thumbnail: info?.thumbnail ?? null,
      quantity: qty,
      unit_price: unitPrice,
      total: unitPrice * qty,
      subtotal: unitPrice * qty,
      detail: {
        id: action.id,
        quantity: qty,
        fulfilled_quantity: 0,
        shipped_quantity: 0,
        delivered_quantity: 0,
        unit_price: unitPrice,
      },
      adjustments: [],
      actions: [action],
    })
  }

  return {
    ...activeChange,
    actions: changeActions,
  }
}

function cloneItem(item: Record<string, unknown>): Record<string, unknown> {
  return {
    ...item,
    detail: { ...((item.detail as object) ?? {}) },
    actions: [] as PreviewAction[],
  }
}

async function loadVariantTitles(db: Db, variantIds: string[]) {
  const map = new Map<string, Record<string, unknown>>()
  if (variantIds.length === 0) return map
  const rows = await db
    .select({
      id: productVariant.id,
      title: productVariant.title,
      sku: productVariant.sku,
    })
    .from(productVariant)
    .where(isNull(productVariant.deleted_at))
  for (const v of rows) {
    if (variantIds.includes(v.id)) map.set(v.id, v)
  }
  return map
}

function applyReturnItems(
  items: Record<string, unknown>[],
  returnId: string,
  returnRows: (typeof returnItem.$inferSelect)[],
) {
  const byLineId = new Map(returnRows.map((r) => [r.item_id, r]))
  for (const item of items) {
    const ri = byLineId.get(item.id as string)
    if (!ri) continue
    const qty = num(ri.quantity)
    const lineQty = num(item.quantity) || 1
    const unitTotal = num(item.total) / lineQty
    const action: PreviewAction = {
      action: "RETURN_ITEM",
      id: ri.id,
      return_id: returnId,
      internal_note: ri.note,
      details: ri.note ? { reason_id: ri.note } : undefined,
    }
    item.actions = [...((item.actions as PreviewAction[]) ?? []), action]
    item.detail = {
      ...(item.detail as object),
      quantity: lineQty,
      return_requested_quantity: qty,
    }
    item.return_requested_total = unitTotal * qty
  }
}

function applyMetadataInbound(
  items: Record<string, unknown>[],
  returnId: string | null,
  exchangeId: string | null,
  claimId: string | null,
  inbound: Array<{ id?: string; item_id: string; quantity: number; note?: string; reason_id?: string }>,
) {
  const byLineId = new Map(inbound.map((i) => [i.item_id, i]))
  for (const item of items) {
    const inboundItem = byLineId.get(item.id as string)
    if (!inboundItem) continue
    const qty = inboundItem.quantity
    const lineQty = num(item.quantity) || 1
    const unitTotal = num(item.total) / lineQty
    const action: PreviewAction = {
      action: "RETURN_ITEM",
      id: inboundItem.id ?? `${String(item.id)}_in`,
      return_id: returnId ?? undefined,
      exchange_id: exchangeId ?? undefined,
      claim_id: claimId ?? undefined,
      internal_note: inboundItem.note ?? null,
      details: inboundItem.reason_id ? { reason_id: inboundItem.reason_id } : undefined,
    }
    item.actions = [...((item.actions as PreviewAction[]) ?? []), action]
    item.detail = {
      ...(item.detail as object),
      quantity: lineQty,
      return_requested_quantity: qty,
    }
    item.return_requested_total = unitTotal * qty
  }
}

async function appendOutboundItems(
  db: Db,
  items: Record<string, unknown>[],
  outbound: Array<{ id?: string; variant_id: string; quantity: number }>,
  ctx: { exchangeId?: string; claimId?: string },
) {
  const variantMap = await loadVariantTitles(db, outbound.map((o) => o.variant_id))
  for (const ob of outbound) {
    const variant = variantMap.get(ob.variant_id)
    items.push({
      id: ob.id ?? `out_${ob.variant_id}`,
      variant_id: ob.variant_id,
      title: variant?.title ?? ob.variant_id,
      variant_sku: variant?.sku ?? "",
      subtitle: "",
      thumbnail: null,
      quantity: ob.quantity,
      total: 0,
      detail: { quantity: ob.quantity },
      adjustments: [],
      actions: [
        {
          action: "ITEM_ADD",
          id: ob.id ?? `out_${ob.variant_id}`,
          exchange_id: ctx.exchangeId,
          claim_id: ctx.claimId,
        },
      ],
    })
  }
}

function buildShippingMethods(
  methods: Array<Record<string, unknown>>,
  returnId: string | null,
  isInbound: boolean,
) {
  return methods.map((m) => ({
    id: m.id,
    shipping_option_id: m.shipping_option_id ?? m.option_id,
    total: num(m.amount ?? m.total ?? 0),
    actions: [
      {
        action: "SHIPPING_ADD",
        id: m.id as string,
        ...(isInbound && returnId ? { return_id: returnId } : {}),
      },
    ],
  }))
}

function sumReturnRequested(items: Record<string, unknown>[]) {
  return items.reduce((acc, i) => acc + num(i.return_requested_total), 0)
}

function shippingFromMeta(meta: Record<string, unknown>) {
  const methods = meta.shipping_methods ?? meta.inbound_shipping
  return Array.isArray(methods) ? (methods as Array<Record<string, unknown>>) : []
}

export async function createCompanionReturn(orderId: string, orderVersion = 1) {
  const db = getDb()
  const id = generateId("ret")
  await db.insert(orderReturn).values({
    id,
    order_id: orderId,
    order_version: orderVersion,
    status: "open",
    created_by: "admin",
  })
  return id
}

export async function buildAdminOrderPreview(orderId: string) {
  const db = getDb() as Db
  const [ord] = await db
    .select()
    .from(order)
    .where(and(eq(order.id, orderId), isNull(order.deleted_at)))
    .limit(1)

  if (!ord) {
    throw new HTTPException(404, { message: "Order not found" })
  }

  const base = (await presentAdminOrderDetail(
    db,
    ord,
    "*items,*items.variant,*shipping_methods,*summary",
  )) as Record<string, unknown> & {
    items?: Record<string, unknown>[]
    shipping_methods?: Record<string, unknown>[]
    currency_code?: string
  }

  const [activeChange] = await db
    .select()
    .from(orderChange)
    .where(
      and(
        eq(orderChange.order_id, orderId),
        isNull(orderChange.confirmed_at),
        isNull(orderChange.canceled_at),
      ),
    )
    .orderBy(desc(orderChange.created_at))
    .limit(1)

  const items = ((base.items ?? []) as Record<string, unknown>[]).map(cloneItem)
  let shipping_methods: Record<string, unknown>[] = []

  if (activeChange?.return_id && ["return_request", "return_receive"].includes(activeChange.change_type ?? "")) {
    const [ret] = await db
      .select()
      .from(orderReturn)
      .where(and(eq(orderReturn.id, activeChange.return_id), isNull(orderReturn.deleted_at)))
      .limit(1)
    if (ret) {
      const riRows = await db.select().from(returnItem).where(eq(returnItem.return_id, ret.id))
      applyReturnItems(items, ret.id, riRows)
      const returnShipping = shippingFromMeta((ret.metadata ?? {}) as Record<string, unknown>)
      if (returnShipping.length) {
        shipping_methods = buildShippingMethods(returnShipping, ret.id, true) as Record<string, unknown>[]
      }
    }
  }

  if (activeChange?.exchange_id && activeChange.change_type === "exchange") {
    const [ex] = await db
      .select()
      .from(orderExchange)
      .where(and(eq(orderExchange.id, activeChange.exchange_id), isNull(orderExchange.deleted_at)))
      .limit(1)
    if (ex) {
      const meta = (ex.metadata ?? {}) as Record<string, unknown>
      applyMetadataInbound(items, activeChange.return_id, ex.id, null, (meta.inbound_items as any[]) ?? [])
      await appendOutboundItems(db, items, (meta.outbound_items as any[]) ?? [], { exchangeId: ex.id })
      shipping_methods = [
        ...buildShippingMethods((meta.inbound_shipping as any[]) ?? [], activeChange.return_id, true),
        ...buildShippingMethods((meta.outbound_shipping as any[]) ?? [], null, false),
      ] as Record<string, unknown>[]
    }
  }

  if (activeChange?.claim_id && activeChange.change_type === "claim") {
    const [cl] = await db
      .select()
      .from(orderClaim)
      .where(and(eq(orderClaim.id, activeChange.claim_id), isNull(orderClaim.deleted_at)))
      .limit(1)
    if (cl) {
      const claimItemRows = await db
        .select()
        .from(orderClaimItem)
        .where(eq(orderClaimItem.claim_id, cl.id))
      const meta = (cl.metadata ?? {}) as Record<string, unknown>
      if (claimItemRows.length) {
        for (const ci of claimItemRows) {
          const item = items.find((i) => i.id === ci.item_id)
          if (!item) continue
          const qty = num(ci.quantity)
          const lineQty = num(item.quantity) || 1
          const unitTotal = num(item.total) / lineQty
          item.actions = [
            ...((item.actions as PreviewAction[]) ?? []),
            {
              action: "RETURN_ITEM",
              id: ci.id,
              return_id: activeChange.return_id ?? undefined,
              claim_id: cl.id,
              internal_note: ci.note,
              details: ci.reason ? { reason_id: ci.reason } : undefined,
            },
          ]
          item.detail = { ...(item.detail as object), quantity: lineQty, return_requested_quantity: qty }
          item.return_requested_total = unitTotal * qty
        }
      } else {
        applyMetadataInbound(items, activeChange.return_id, null, cl.id, (meta.inbound_items as any[]) ?? [])
      }
      await appendOutboundItems(db, items, (meta.outbound_items as any[]) ?? [], { claimId: cl.id })
      shipping_methods = [
        ...buildShippingMethods((meta.inbound_shipping as any[]) ?? [], activeChange.return_id, true),
        ...buildShippingMethods((meta.outbound_shipping as any[]) ?? [], null, false),
      ] as Record<string, unknown>[]
    }
  }

  if (shipping_methods.length === 0) {
    shipping_methods = ((base.shipping_methods ?? []) as Record<string, unknown>[]).map((s) => ({
      ...s,
      actions: [],
    }))
  }

  let orderChangeDto: Record<string, unknown> | null = activeChange
    ? { ...activeChange }
    : null

  if (activeChange?.change_type === "edit") {
    orderChangeDto = await applyOrderEditToPreview(
      db,
      items,
      activeChange,
      String(base.currency_code ?? "usd"),
    )
  }

  const decorated = decorateOrderTotals({
    ...base,
    id: orderId,
    items,
    shipping_methods,
  })

  return {
    order: {
      ...decorated,
      order_change: orderChangeDto,
      return_requested_total: sumReturnRequested(items),
    },
  }
}
