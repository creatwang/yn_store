/** 解析 Medusa raw_amount / raw_quantity（value 或 amount 字段）为 number */
export function toAmount(value: unknown): number {
  if (value == null) return 0
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>
    if ("value" in obj) return toAmount(obj.value)
    if ("amount" in obj) return toAmount(obj.amount)
  }
  return 0
}

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF",
  "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
])

export function getCurrencyEpsilon(currencyCode?: string | null): number {
  if (!currencyCode) return 0.01
  return ZERO_DECIMAL_CURRENCIES.has(currencyCode.toUpperCase()) ? 1 : 0.01
}

export const bn = {
  gt: (a: unknown, b: number) => toAmount(a) > b,
  lte: (a: unknown, b: unknown) => toAmount(a) <= toAmount(b),
  eq: (a: unknown, b: unknown) => Math.abs(toAmount(a) - toAmount(b)) < 1e-9,
  sub: (a: unknown, b: unknown) => toAmount(a) - toAmount(b),
  lt: (a: unknown, b: unknown) => toAmount(a) < toAmount(b),
}
