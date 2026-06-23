/**
 * 库存 ↔ 外部 WMS/ERP 同步钩子（扩展点）
 *
 * 【当前阶段】
 * - 库存真相源 = 本库 `inventory_level` + `reservation_item`
 * - 结账预留、履约扣减均在 `inventory-reservation.service.ts` 写本地 DB
 * - 本文件各 hook 默认空操作，**不调用**真实 WMS/ERP（非当前必须项）
 *
 * 【两阶段库存 — 两个入口、各改各的表】
 *
 * ① 结账（Store `POST /store/carts/:id/complete`）
 *    → order-confirm / reserve-inventory
 *    → 校验可售量，写 reservation_item，inventory_level.reserved_quantity ↑
 *    → stocked_quantity 不变（货还在架上，只是被订单占住）
 *    → 完成后可调用 syncAfterCheckoutReserve（未来推 WMS 预占）
 *
 * ② 发货（Admin `POST /admin/orders/:id/fulfillments` + location_id）
 *    → fulfillment-create / deductInventoryForFulfillment
 *    → stocked_quantity ↓，reserved_quantity ↓，消耗 reservation_item
 *    → 完成后可调用 syncAfterFulfillmentDeduct（未来推 WMS 出库）
 *
 * 【接真实 WMS/ERP 时建议步骤】
 * 1. 实现 `InventoryProvider` 可选生命周期方法（见 `lib/payment/providers/types.ts`）
 * 2. 在 `registerDefaultProviders()` 注册，如 `providers.inventory.set("wms", …)`
 * 3. 设置 `INVENTORY_PROVIDER_ID=wms`（或按 stock_location 选 provider）
 * 4. 在本文件 hook 内调用 provider；明确双写策略：
 *    - 本地 DB 为准 + 异步推 WMS；或
 *    - WMS 为准 + 定时 pullStock 对账
 * 5. 失败策略：是否回滚本地事务、重试队列、人工对账 — 按业务定，当前未实现
 */
import { providers } from "../payment/providers"

/** 与 inventory-reservation.service InventoryDeduction 同构，避免循环依赖 */
type InventoryDeduction = {
  reservation_id: string | null
  inventory_item_id: string
  location_id: string
  quantity: number
}

function activeInventoryProvider() {
  const id = process.env.INVENTORY_PROVIDER_ID?.trim() || "noop"
  return providers.inventory.get(id) ?? providers.inventory.get("noop")
}

export type CheckoutReserveSyncPayload = {
  reservation_ids: string[]
  sales_channel_id: string | null
  lines: Array<{
    line_item_id: string
    inventory_item_id: string
    location_id: string
    quantity: number
  }>
}

export type FulfillmentDeductSyncPayload = {
  fulfillment_id?: string
  location_id: string
  deductions: InventoryDeduction[]
}

/** 结账预留成功后 — 未来向 WMS 同步预占/软预留 */
export async function syncAfterCheckoutReserve(
  payload: CheckoutReserveSyncPayload,
): Promise<void> {
  const provider = activeInventoryProvider()
  await provider?.onCheckoutReserve?.(payload)
}

/** 释放预留后 — 未来向 WMS 同步取消预占 */
export async function syncAfterReleaseReservations(
  reservationIds: string[],
): Promise<void> {
  const provider = activeInventoryProvider()
  await provider?.onReleaseReservations?.({ reservation_ids: reservationIds })
}

/** 履约扣减成功后 — 未来向 WMS 同步出库/扣减 */
export async function syncAfterFulfillmentDeduct(
  payload: FulfillmentDeductSyncPayload,
): Promise<void> {
  const provider = activeInventoryProvider()
  await provider?.onFulfillmentDeduct?.(payload)
}

/** 取消履约恢复库存后 — 未来向 WMS 同步回库 */
export async function syncAfterRestoreDeductions(
  deductions: InventoryDeduction[],
): Promise<void> {
  const provider = activeInventoryProvider()
  await provider?.onRestoreDeductions?.({ deductions })
}
