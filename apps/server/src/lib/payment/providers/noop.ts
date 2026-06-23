/**
 * NOOP Provider — 开发环境占位，返回 mock / 空操作，不调用真实外部 API。
 *
 * 接生产服务：实现同目录 `types.ts` 中的接口 → 在 `index.ts` 的
 * `registerDefaultProviders()` 注册（如 `providers.payment.set("stripe", …)`）→
 * workflow step 改用对应 provider id。无需改 Medusa 官方代码。
 */
import type {
  PaymentProvider, ShippingProvider,
  NotificationProvider, InventoryProvider,
  RateQuote, TrackingInfo,
} from "./types"

export class NOOPPaymentProvider implements PaymentProvider {
  id = "noop"
  async authorize(_input: { payment_id: string; amount: number; currency: string }) {
    return { transaction_id: "manual" }
  }
  async capture(_input: { transaction_id: string; amount: number }) {
    return { capture_id: "manual" }
  }
  async refund(_input: { transaction_id: string; amount: number }) {
    return { refund_id: "manual" }
  }
  async cancel(_input: { transaction_id: string }) { /* noop */ }
}

export class NOOPShippingProvider implements ShippingProvider {
  id = "noop"
  async getRates(_input: any): Promise<RateQuote[]> {
    return []
  }
  async createLabel(_input: { rate_id?: string; fulfillment_id: string }) {
    return {
      tracking_number: `NOOP-${_input.fulfillment_id.slice(0, 8)}`,
      label_url: "",
    }
  }
  async cancelLabel(_input: { label_id: string }) { /* noop */ }
  async track(_input: { tracking_number: string }): Promise<TrackingInfo> {
    return { tracking_number: _input.tracking_number, status: "in_transit", events: [] }
  }
}

export class NOOPNotificationProvider implements NotificationProvider {
  id = "noop"
  channel = "email" as const
  async send(_input: { to: string; template: string; data: Record<string, unknown> }) { /* noop — mail.ts handles this */ }
}

/**
 * 库存 NOOP：结账/履约只写本地 DB，不推 WMS。
 * 接 ERP 时实现 onCheckoutReserve / onFulfillmentDeduct 等（types.ts）。
 */
export class NOOPInventoryProvider implements InventoryProvider {
  id = "noop"
  async pushAdjustment(_input: {
    inventory_item_id: string
    quantity: number
    reason: string
  }) {
    /* noop */
  }
  async pullStock(_input: { sku: string }) {
    return { quantity: 0 }
  }
}
