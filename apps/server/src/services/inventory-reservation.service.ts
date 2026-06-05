/**
 * 库存预留 / 扣减（本地 DB，对齐 Medusa 两阶段模型）
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ 阶段 ① 结账（Store complete）— confirmAndReserveForOrder        │
 * │  入口: order-confirm workflow → step reserve-inventory          │
 * │  动作: 校验可售量 → reservation_item + reserved_quantity ↑    │
 * │  不动: stocked_quantity（尚未出库）                           │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ 阶段 ② 发货（Admin 创建履约）— deductInventoryForFulfillment    │
 * │  入口: fulfillment-create workflow（需 location_id）            │
 * │  动作: stocked ↓ + reserved ↓ + 消耗 reservation_item         │
 * │  订单行 fulfilled/shipped 仍由 fulfillment workflow 原有逻辑  │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ 回滚: releaseReservations / restoreInventoryDeductions        │
 * │ WMS/ERP: 非当前必须项；外部同步见 lib/inventory-external-hook │
 * └─────────────────────────────────────────────────────────────────┘
 */
import { and, eq, inArray, isNull, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  inventoryLevel,
  productVariant,
  productVariantInventoryItem,
  reservationItem,
  salesChannelStockLocation,
  stockLocation,
} from "@my-store/db"
import type { DbTx } from "../lib/transaction"
import { runInTransaction } from "../lib/transaction"
import { HTTPException } from "hono/http-exception"
import {
  syncAfterCheckoutReserve,
  syncAfterFulfillmentDeduct,
  syncAfterReleaseReservations,
  syncAfterRestoreDeductions,
} from "../lib/inventory-external-hook"

export type OrderLineForInventory = {
  line_item_id: string
  variant_id: string | null
  quantity: number
}

export type InventoryDeduction = {
  reservation_id: string | null
  inventory_item_id: string
  location_id: string
  quantity: number
}

function toNum(v: unknown): number {
  return Number(v ?? 0)
}

export async function resolveStockLocationIds(
  salesChannelId: string | null,
  inventoryItemIds: string[] = [],
): Promise<string[]> {
  const db = getDb()
  const uniqueItemIds = [...new Set(inventoryItemIds.filter(Boolean))]

  let salesChannelLocationIds: string[] = []
  if (salesChannelId) {
    const rows = await db
      .select({ id: salesChannelStockLocation.stock_location_id })
      .from(salesChannelStockLocation)
      .where(eq(salesChannelStockLocation.sales_channel_id, salesChannelId))
    salesChannelLocationIds = rows.map((r) => r.id).filter(Boolean)
  }

  let levelLocationIds: string[] = []
  if (uniqueItemIds.length) {
    const rows = await db
      .selectDistinct({ id: inventoryLevel.location_id })
      .from(inventoryLevel)
      .where(inArray(inventoryLevel.inventory_item_id, uniqueItemIds))
    levelLocationIds = rows.map((r) => r.id).filter(Boolean)
  }

  if (salesChannelLocationIds.length && levelLocationIds.length) {
    const levelSet = new Set(levelLocationIds)
    const intersected = salesChannelLocationIds.filter((id) => levelSet.has(id))
    if (intersected.length) return intersected
    return salesChannelLocationIds
  }
  if (salesChannelLocationIds.length) return salesChannelLocationIds
  if (levelLocationIds.length) return levelLocationIds

  const rows = await db
    .select({ id: stockLocation.id })
    .from(stockLocation)
    .where(isNull(stockLocation.deleted_at))
  return rows.map((r) => r.id)
}

async function getLevel(
  db: DbTx | ReturnType<typeof getDb>,
  inventoryItemId: string,
  locationId: string,
) {
  const [level] = await db
    .select()
    .from(inventoryLevel)
    .where(
      and(
        eq(inventoryLevel.inventory_item_id, inventoryItemId),
        eq(inventoryLevel.location_id, locationId),
      ),
    )
    .limit(1)
  return level ?? null
}

export async function adjustReservedQuantity(
  inventoryItemId: string,
  locationId: string,
  delta: number,
  tx?: DbTx,
) {
  const db = tx ?? getDb()
  const level = await getLevel(db, inventoryItemId, locationId)
  if (!level) {
    if (delta <= 0) return
    const qty = delta
    await db.insert(inventoryLevel).values({
      id: generateId("ilev"),
      inventory_item_id: inventoryItemId,
      location_id: locationId,
      stocked_quantity: "0",
      raw_stocked_quantity: { amount: 0, precision: 0 },
      reserved_quantity: String(qty),
      raw_reserved_quantity: { amount: qty, precision: 0 },
      incoming_quantity: "0",
      raw_incoming_quantity: { amount: 0, precision: 0 },
    })
    return
  }
  const next = Math.max(0, toNum(level.reserved_quantity) + delta)
  await db
    .update(inventoryLevel)
    .set({
      reserved_quantity: String(next),
      raw_reserved_quantity: { amount: next, precision: 0 },
    })
    .where(eq(inventoryLevel.id, level.id))
}

export async function adjustStockedQuantity(
  inventoryItemId: string,
  locationId: string,
  delta: number,
  tx?: DbTx,
) {
  const db = tx ?? getDb()
  const level = await getLevel(db, inventoryItemId, locationId)
  if (!level) return
  const next = Math.max(0, toNum(level.stocked_quantity) + delta)
  await db
    .update(inventoryLevel)
    .set({
      stocked_quantity: String(next),
      raw_stocked_quantity: { amount: next, precision: 0 },
    })
    .where(eq(inventoryLevel.id, level.id))
}

async function loadLevelsForLocations(
  inventoryItemId: string,
  locationIds: string[],
) {
  if (!locationIds.length) return []
  const db = getDb()
  return db
    .select()
    .from(inventoryLevel)
    .where(
      and(
        eq(inventoryLevel.inventory_item_id, inventoryItemId),
        inArray(inventoryLevel.location_id, locationIds),
      ),
    )
}

function availableFromLevel(
  level: typeof inventoryLevel.$inferSelect | undefined,
) {
  if (!level) return 0
  return Math.max(
    0,
    toNum(level.stocked_quantity) - toNum(level.reserved_quantity),
  )
}

async function sumAvailable(
  inventoryItemId: string,
  locationIds: string[],
): Promise<number> {
  const levels = await loadLevelsForLocations(inventoryItemId, locationIds)
  const byLoc = new Map(levels.map((l) => [l.location_id, l]))
  let sum = 0
  for (const locId of locationIds) {
    sum += availableFromLevel(byLoc.get(locId))
  }
  return sum
}

async function pickLocation(
  inventoryItemId: string,
  locationIds: string[],
  needQty: number,
): Promise<string | null> {
  const levels = await loadLevelsForLocations(inventoryItemId, locationIds)
  const byLoc = new Map(levels.map((l) => [l.location_id, l]))
  let best: { id: string; available: number } | null = null
  for (const locId of locationIds) {
    const available = availableFromLevel(byLoc.get(locId))
    if (available >= needQty) return locId
    if (!best || available > best.available) {
      best = { id: locId, available }
    }
  }
  return best?.id ?? locationIds[0] ?? null
}

async function loadVariant(variantId: string) {
  const db = getDb()
  const [row] = await db
    .select()
    .from(productVariant)
    .where(
      and(eq(productVariant.id, variantId), isNull(productVariant.deleted_at)),
    )
    .limit(1)
  return row ?? null
}

async function loadVariantInventoryLinks(variantId: string) {
  const db = getDb()
  return db
    .select()
    .from(productVariantInventoryItem)
    .where(
      and(
        eq(productVariantInventoryItem.variant_id, variantId),
        isNull(productVariantInventoryItem.deleted_at),
      ),
    )
}

/**
 * 阶段 ① 结账预留（与发货无关，仅在 Store complete 时触发一次）
 *
 * manage_inventory=false 或 allow_backorder=true 时跳过校验但仍可能写预留。
 */
export async function confirmAndReserveForOrder(input: {
  sales_channel_id: string | null
  order_lines: OrderLineForInventory[]
}): Promise<string[]> {
  const inventoryItemIds: string[] = []
  for (const line of input.order_lines) {
    if (!line.variant_id || line.quantity <= 0) continue
    const variant = await loadVariant(line.variant_id)
    if (!variant?.manage_inventory) continue
    const links = await loadVariantInventoryLinks(line.variant_id)
    for (const link of links) {
      inventoryItemIds.push(link.inventory_item_id)
    }
  }

  const locationIds = await resolveStockLocationIds(
    input.sales_channel_id,
    inventoryItemIds,
  )
  if (!locationIds.length) {
    return []
  }

  const reservationIds: string[] = []
  const syncLines: Array<{
    line_item_id: string
    inventory_item_id: string
    location_id: string
    quantity: number
  }> = []

  await runInTransaction(async (tx) => {
    for (const line of input.order_lines) {
      if (!line.variant_id || line.quantity <= 0) continue

      const variant = await loadVariant(line.variant_id)
      if (!variant?.manage_inventory) continue

      const links = await loadVariantInventoryLinks(line.variant_id)
      for (const link of links) {
        const requiredPerUnit = link.required_quantity ?? 1
        const needQty = line.quantity * requiredPerUnit

        if (!variant.allow_backorder) {
          const available = await sumAvailable(
            link.inventory_item_id,
            locationIds,
          )
          if (available < needQty) {
            throw new HTTPException(400, {
              message: "Some variant does not have the required inventory",
            })
          }
        }

        const locationId = await pickLocation(
          link.inventory_item_id,
          locationIds,
          needQty,
        )
        if (!locationId) continue

        const resId = generateId("resitem")
        await tx.insert(reservationItem).values({
          id: resId,
          line_item_id: line.line_item_id,
          allow_backorder: variant.allow_backorder ?? false,
          location_id: locationId,
          inventory_item_id: link.inventory_item_id,
          quantity: String(needQty),
          raw_quantity: { amount: needQty, precision: 0 },
          description: `order checkout`,
          created_by: "checkout",
          created_at: sql`now()`,
          updated_at: sql`now()`,
        })
        await adjustReservedQuantity(
          link.inventory_item_id,
          locationId,
          needQty,
          tx,
        )
        reservationIds.push(resId)
        syncLines.push({
          line_item_id: line.line_item_id,
          inventory_item_id: link.inventory_item_id,
          location_id: locationId,
          quantity: needQty,
        })
      }
    }
  })

  // WMS/ERP 扩展点：当前 NOOP，不阻塞结账
  await syncAfterCheckoutReserve({
    reservation_ids: reservationIds,
    sales_channel_id: input.sales_channel_id,
    lines: syncLines,
  })

  return reservationIds
}

/** 回滚预留（workflow compensate；订单取消释放预留 — 待接 order.cancel） */
export async function releaseReservations(reservationIds: string[]) {
  if (!reservationIds.length) return

  await runInTransaction(async (tx) => {
    const rows = await tx
      .select()
      .from(reservationItem)
      .where(
        and(
          inArray(reservationItem.id, reservationIds),
          isNull(reservationItem.deleted_at),
        ),
      )

    for (const row of rows) {
      const qty = toNum(row.quantity)
      await adjustReservedQuantity(
        row.inventory_item_id,
        row.location_id,
        -qty,
        tx,
      )
      await tx
        .update(reservationItem)
        .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
        .where(eq(reservationItem.id, row.id))
    }
  })

  await syncAfterReleaseReservations(reservationIds)
}

/**
 * 阶段 ② 履约扣减（与结账无关，仅在 Admin 创建履约且带 location_id 时触发）
 */
export async function deductInventoryForFulfillment(input: {
  location_id: string
  items: Array<{ line_item_id: string; quantity: number }>
}): Promise<InventoryDeduction[]> {
  const { location_id: locationId, items } = input
  if (!locationId?.trim() || !items.length) return []

  const deductions: InventoryDeduction[] = []

  await runInTransaction(async (tx) => {
    for (const item of items) {
      if (!item.line_item_id) continue
      let remaining = item.quantity

      const reservations = await tx
        .select()
        .from(reservationItem)
        .where(
          and(
            eq(reservationItem.line_item_id, item.line_item_id),
            eq(reservationItem.location_id, locationId),
            isNull(reservationItem.deleted_at),
          ),
        )

      for (const res of reservations) {
        if (remaining <= 0) break
        const resQty = toNum(res.quantity)
        const take = Math.min(remaining, resQty)

        await adjustStockedQuantity(
          res.inventory_item_id,
          locationId,
          -take,
          tx,
        )
        await adjustReservedQuantity(
          res.inventory_item_id,
          locationId,
          -take,
          tx,
        )

        const left = resQty - take
        if (left <= 0) {
          await tx
            .update(reservationItem)
            .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
            .where(eq(reservationItem.id, res.id))
        } else {
          await tx
            .update(reservationItem)
            .set({
              quantity: String(left),
              raw_quantity: { amount: left, precision: 0 },
              updated_at: sql`now()`,
            })
            .where(eq(reservationItem.id, res.id))
        }

        deductions.push({
          reservation_id: res.id,
          inventory_item_id: res.inventory_item_id,
          location_id: locationId,
          quantity: take,
        })
        remaining -= take
      }

      if (remaining > 0) {
        throw new HTTPException(400, {
          message: `Insufficient reservation for line item ${item.line_item_id}`,
        })
      }
    }
  })

  await syncAfterFulfillmentDeduct({
    location_id: locationId,
    deductions,
  })

  return deductions
}

/** 取消履约：恢复 stocked + reserved，并恢复 reservation 记录 */
export async function restoreInventoryDeductions(
  deductions: InventoryDeduction[],
) {
  if (!deductions.length) return

  await runInTransaction(async (tx) => {
    for (const d of deductions) {
      await adjustStockedQuantity(
        d.inventory_item_id,
        d.location_id,
        d.quantity,
        tx,
      )
      await adjustReservedQuantity(
        d.inventory_item_id,
        d.location_id,
        d.quantity,
        tx,
      )

      if (d.reservation_id) {
        const [existing] = await tx
          .select()
          .from(reservationItem)
          .where(eq(reservationItem.id, d.reservation_id))
          .limit(1)

        if (existing?.deleted_at) {
          await tx
            .update(reservationItem)
            .set({
              deleted_at: null,
              quantity: String(d.quantity),
              raw_quantity: { amount: d.quantity, precision: 0 },
              updated_at: sql`now()`,
            })
            .where(eq(reservationItem.id, d.reservation_id))
        }
      }
    }
  })

  await syncAfterRestoreDeductions(deductions)
}
