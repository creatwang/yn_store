import { toAmount } from "./big-number"

/** 对齐 Medusa AdminOrder.summary（transform-order 展平后的 totals） */
const SUMMARY_DEFAULTS = {
  total: 0,
  subtotal: 0,
  tax_total: 0,
  discount_total: 0,
  shipping_total: 0,
  transaction_total: 0,
  pending_difference: 0,
} as const

export function formatAdminOrderSummary(
  summaryRow: { totals: unknown } | null | undefined,
) {
  if (!summaryRow?.totals || typeof summaryRow.totals !== "object") {
    return { ...SUMMARY_DEFAULTS }
  }

  const raw = summaryRow.totals as Record<string, unknown>
  const normalized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(raw)) {
    if (value === null || value === undefined) {
      normalized[key] = value
      continue
    }
    if (typeof value === "object" && !Array.isArray(value)) {
      normalized[key] = toAmount(value)
    } else if (typeof value === "string" || typeof value === "number") {
      normalized[key] = toAmount(value)
    } else {
      normalized[key] = value
    }
  }

  return {
    ...SUMMARY_DEFAULTS,
    ...normalized,
    total: toAmount(raw.total ?? raw.original_order_total ?? SUMMARY_DEFAULTS.total),
    transaction_total: toAmount(
      raw.transaction_total ?? SUMMARY_DEFAULTS.transaction_total,
    ),
    pending_difference: toAmount(
      raw.pending_difference ?? SUMMARY_DEFAULTS.pending_difference,
    ),
  }
}
