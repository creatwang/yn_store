/**
 * Admin 订单 Preview DTO — RMA 向导（退货/换货/索赔）依赖
 */
import { and, desc, eq, isNull } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import {
  generateId,
  getDb,
  order,
  orderChange,
  orderClaim,
  orderClaimItem,
  orderExchange,
  orderReturn,
  productVariant,
  returnItem,
} from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import { toAmount } from "../../lib/big-number"
import { presentAdminOrderDetail } from "./admin-order"

type Db = NodePgDatabase<Record<string, never>>

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

function cloneItem(item: Record<string, unknown>) {
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
      details: ri.reason ? { reason_id: ri.reason } : undefined,
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

  const base = await presentAdminOrderDetail(
    db,
    ord,
    "*items,*items.variant,*shipping_methods,*summary",
  )

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

  const summary = {
    ...((base.summary as object) ?? {}),
    pending_difference: num((base.summary as any)?.pending_difference),
  }

  return {
    order: {
      ...base,
      id: orderId,
      items,
      shipping_methods,
      summary,
      order_change: activeChange ?? null,
      return_requested_total: sumReturnRequested(items),
    },
  }
}
