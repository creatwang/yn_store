/**
 * 外部服务 Provider 注册表（Workflow 通过此处注入，**不依赖 Medusa 官方插件**）
 *
 * 当前全部为 NOOP 占位，开发/手工支付可正常跑通。接真实服务时：
 *
 * 1. 在 `lib/payment/providers/` 新增实现（如 `stripe-payment.ts`、`shippo-shipping.ts`）
 * 2. 在 `registerDefaultProviders()` 里 `providers.*.set("stripe", new StripePaymentProvider())`
 * 3. 各 workflow step 把 `providers.payment.get("noop")` 改为配置项或默认 id
 *    （例：`order-confirm` 的 authorize-payment、`payment-capture` 的 capture-external）
 *
 * | 类型 | 接口 | 典型替换 | 使用 workflow |
 * |------|------|----------|---------------|
 * | payment | PaymentProvider | Stripe / 支付宝 | order-confirm, payment-capture/refund |
 * | shipping | ShippingProvider | Shippo / 顺丰 API | fulfillment-create, fulfillment-ship |
 * | inventory | InventoryProvider | WMS / ERP 库存 | **非当前必须**；本地 DB 已由 inventory-reservation.service 写入；外部同步 hook 见 `lib/inventory-external-hook.ts`（onCheckoutReserve / onFulfillmentDeduct 等） |
 * | notification | NotificationProvider | SendGrid / 短信 | 可选；邮件现由 notification.service + mail.ts |
 */
import { createProviderRegistry } from "./types"
import { NOOPPaymentProvider, NOOPShippingProvider, NOOPNotificationProvider, NOOPInventoryProvider } from "./noop"
import type { ProviderRegistry } from "./types"

export type { PaymentProvider, ShippingProvider, NotificationProvider, InventoryProvider } from "./types"

/** 全局 Provider 注册表 */
export const providers: ProviderRegistry = createProviderRegistry()

/** 启动时注册默认 NOOP Provider（接 Stripe/物流/WMS 时在此追加真实实现） */
export function registerDefaultProviders(): void {
  providers.payment.set("noop", new NOOPPaymentProvider())
  providers.shipping.set("noop", new NOOPShippingProvider())
  providers.notification.set("noop", new NOOPNotificationProvider())
  providers.inventory.set("noop", new NOOPInventoryProvider())
}
