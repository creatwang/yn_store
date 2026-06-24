/** Store API 请求头：结算货币（小写 ISO 4217，如 usd / cny） */
export const STORE_CURRENCY_HEADER = "x-store-currency"

export function normalizeCurrencyCode(code?: string | null): string {
  const normalized = (code ?? "usd").toLowerCase().trim()
  return /^[a-z]{3}$/.test(normalized) ? normalized : "usd"
}

export function resolveRequestCurrency(
  headerCurrency?: string | null,
  queryCurrency?: string | null,
): string {
  return normalizeCurrencyCode(headerCurrency || queryCurrency || undefined)
}
