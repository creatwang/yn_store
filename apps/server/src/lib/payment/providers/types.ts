// ── Provider 接口定义 ─────────────────────────────────────
// 未来外部服务都通过 Provider 注入，Workflow 通过 provider ID 查找实现
// 当前全部为 NOOP Provider，未来只需实现对应接口并注册

export interface PaymentProvider {
  id: string
  /** 授权扣款（创建订单后） */
  authorize(input: { payment_id: string; amount: number; currency: string }): Promise<{ transaction_id: string }>
  /** 实际扣款 */
  capture(input: { transaction_id: string; amount: number }): Promise<{ capture_id: string }>
  /** 退款 */
  refund(input: { transaction_id: string; amount: number; reason?: string }): Promise<{ refund_id: string }>
  /** 取消授权 */
  cancel(input: { transaction_id: string }): Promise<void>
}

export interface ShippingProvider {
  id: string
  /** 计算费率 */
  getRates(input: { origin: Address; destination: Address; items: Parcel[] }): Promise<RateQuote[]>
  /** 创建运单/获取面单 */
  createLabel(input: { rate_id?: string; fulfillment_id: string }): Promise<{ tracking_number: string; label_url: string }>
  /** 取消运单 */
  cancelLabel(input: { label_id: string }): Promise<void>
  /** 追踪查询 */
  track(input: { tracking_number: string }): Promise<TrackingInfo>
}

export interface NotificationProvider {
  id: string
  channel: "email" | "sms" | "webhook" | "push"
  send(input: { to: string; template: string; data: Record<string, unknown> }): Promise<void>
}

export interface InventoryProvider {
  id: string

  // ── 生命周期钩子（可选，接 WMS/ERP 时实现；NOOP 不实现）──
  // 本地 DB 写入见 inventory-reservation.service；以下仅为外部同步扩展点。

  /** 结账预留成功后 — 对应 Store complete → reserve-inventory */
  onCheckoutReserve?(input: {
    reservation_ids: string[]
    sales_channel_id: string | null
    lines: Array<{
      line_item_id: string
      inventory_item_id: string
      location_id: string
      quantity: number
    }>
  }): Promise<void>

  /** 释放预留后 — compensate / 取消订单（未来） */
  onReleaseReservations?(input: {
    reservation_ids: string[]
  }): Promise<void>

  /** 履约扣减成功后 — 对应 Admin create fulfillment */
  onFulfillmentDeduct?(input: {
    fulfillment_id?: string
    location_id: string
    deductions: Array<{
      reservation_id: string | null
      inventory_item_id: string
      location_id: string
      quantity: number
    }>
  }): Promise<void>

  /** 取消履约恢复库存后 */
  onRestoreDeductions?(input: {
    deductions: Array<{
      reservation_id: string | null
      inventory_item_id: string
      location_id: string
      quantity: number
    }>
  }): Promise<void>

  /** 通用：推送库存变动到外部系统（对账、手工调整等） */
  pushAdjustment(input: {
    inventory_item_id: string
    quantity: number
    reason: string
  }): Promise<void>

  /** 拉取外部库存（对账 job / 以 WMS 为准时） */
  pullStock(input: { sku: string }): Promise<{ quantity: number }>
}

// ── 支持类型 ──────────────────────────────────────────────

export interface Address {
  first_name?: string
  last_name?: string
  company?: string
  address_1?: string
  address_2?: string
  city?: string
  country_code?: string
  province?: string
  postal_code?: string
  phone?: string
}

export interface Parcel {
  weight?: number
  length?: number
  width?: number
  height?: number
  quantity: number
}

export interface RateQuote {
  id: string
  provider_id: string
  service_name: string
  amount: number
  currency: string
  estimated_days?: number
}

export interface TrackingInfo {
  tracking_number: string
  status: string
  estimated_delivery?: string
  events: Array<{ timestamp: string; description: string; location?: string }>
}

// ── Provider 注册表 ──────────────────────────────────────

export interface ProviderRegistry {
  payment: Map<string, PaymentProvider>
  shipping: Map<string, ShippingProvider>
  notification: Map<string, NotificationProvider>
  inventory: Map<string, InventoryProvider>
}

export function createProviderRegistry(): ProviderRegistry {
  return {
    payment: new Map(),
    shipping: new Map(),
    notification: new Map(),
    inventory: new Map(),
  }
}
