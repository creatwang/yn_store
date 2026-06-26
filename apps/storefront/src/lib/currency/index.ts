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

type StoreCurrencyRow = { currency_code?: string | null }
type RegionRow = { id: string; name?: string | null; currency_code?: string | null }

function regionLabelByCurrency(regions: RegionRow[]): Map<string, RegionRow> {
  const map = new Map<string, RegionRow>()
  for (const region of regions) {
    const code = normalizeCurrencyCode(region.currency_code)
    if (!map.has(code)) {
      map.set(code, region)
    }
  }
  return map
}

/**
 * C 端货币切换选项：优先用商店已启用货币（Admin → 商店 → 货币），
 * 再用 Region 匹配 regionId / 展示名；无商店货币时回退到 Region 列表。
 */
export function buildCurrencyOptions(
  storeCurrencies: StoreCurrencyRow[],
  regions: RegionRow[],
): CurrencyOption[] {
  const regionsByCurrency = regionLabelByCurrency(regions)

  if (storeCurrencies.length > 0) {
    const options: CurrencyOption[] = []
    const seen = new Set<string>()
    for (const row of storeCurrencies) {
      const code = normalizeCurrencyCode(row.currency_code)
      if (seen.has(code)) continue
      seen.add(code)
      const region = regionsByCurrency.get(code)
      options.push({
        code,
        label: `${code.toUpperCase()}${region?.name ? ` · ${region.name}` : ""}`,
        regionId: region?.id,
      })
    }
    if (options.length > 0) {
      return options.sort((a, b) => a.code.localeCompare(b.code))
    }
  }

  return dedupeCurrencyOptions(regions)
}
