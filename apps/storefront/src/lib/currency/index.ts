export const DEFAULT_CURRENCY = "usd"
export const CURRENCY_COOKIE = "currency"
export const CURRENCY_STORAGE_KEY = "store_currency"
export const REGION_STORAGE_KEY = "store_region_id"
/** Store API 请求头：结算货币（小写 ISO 4217） */
export const STORE_CURRENCY_HEADER = "x-store-currency"

export type CurrencyOption = {
  code: string
  label: string
  regionId?: string
}

export function normalizeCurrencyCode(code?: string | null): string {
  const normalized = (code ?? DEFAULT_CURRENCY).toLowerCase().trim()
  return /^[a-z]{3}$/.test(normalized) ? normalized : DEFAULT_CURRENCY
}

export function readCurrencyFromCookie(cookieHeader?: string | null): string | undefined {
  if (!cookieHeader) return undefined
  const match = cookieHeader.match(/(?:^|;\s*)currency=([^;]+)/)
  if (!match?.[1]) return undefined
  try {
    return normalizeCurrencyCode(decodeURIComponent(match[1]))
  } catch {
    return normalizeCurrencyCode(match[1])
  }
}

export function formatMoney(
  amount: number | string,
  currencyCode = DEFAULT_CURRENCY,
): string {
  const value = Number(amount)
  if (!Number.isFinite(value)) return "—"
  const code = normalizeCurrencyCode(currencyCode).toUpperCase()
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
    }).format(value)
  } catch {
    return `${code} ${value.toFixed(2)}`
  }
}

export function dedupeCurrencyOptions(
  regions: Array<{ id: string; name?: string | null; currency_code?: string | null }>,
): CurrencyOption[] {
  const map = new Map<string, CurrencyOption>()
  for (const region of regions) {
    const code = normalizeCurrencyCode(region.currency_code)
    if (map.has(code)) continue
    map.set(code, {
      code,
      label: `${code.toUpperCase()}${region.name ? ` · ${region.name}` : ""}`,
      regionId: region.id,
    })
  }
  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code))
}
