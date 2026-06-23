import { getDb, paymentProvider } from "@my-store/db"

const DEFAULT_PROVIDERS = [
  { id: "pp_system_default", is_enabled: true },
] as const

/** 启动时确保内置支付供应商存在于 payment_provider 表 */
export async function ensureDefaultPaymentProviders(): Promise<void> {
  const db = getDb()
  for (const row of DEFAULT_PROVIDERS) {
    await db
      .insert(paymentProvider)
      .values({ id: row.id, is_enabled: row.is_enabled })
      .onConflictDoNothing()
  }
}
