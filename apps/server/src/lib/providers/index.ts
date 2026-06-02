import { createProviderRegistry } from "./types"
import { NOOPPaymentProvider, NOOPShippingProvider, NOOPNotificationProvider, NOOPInventoryProvider } from "./noop"
import type { ProviderRegistry } from "./types"

export type { PaymentProvider, ShippingProvider, NotificationProvider, InventoryProvider } from "./types"

/** 全局 Provider 注册表 */
export const providers: ProviderRegistry = createProviderRegistry()

/** 启动时注册默认 NOOP Provider */
export function registerDefaultProviders(): void {
  providers.payment.set("noop", new NOOPPaymentProvider())
  providers.shipping.set("noop", new NOOPShippingProvider())
  providers.notification.set("noop", new NOOPNotificationProvider())
  providers.inventory.set("noop", new NOOPInventoryProvider())
}
