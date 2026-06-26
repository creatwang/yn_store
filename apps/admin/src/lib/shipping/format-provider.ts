/** 支付渠道 支付/物流渠道 ID 转可读中文（Medusa 仅存 id，如 manual_manual、pp_system_default） */
const PROVIDER_LABELS: Record<string, string> = {
  manual_manual: "手动发货",
  pp_system_default: "系统默认",
}

/**
 * Providers only have an ID to identify them. This function formats the ID
 * into a human-readable string.
 *
 * Format example: pp_stripe-blik_dkk
 *
 * @param id - The ID of the provider
 * @returns A formatted string
 */
export const formatProvider = (id: string) => {
  if (PROVIDER_LABELS[id]) {
    return PROVIDER_LABELS[id]
  }

  const [_, name, type] = id.split("_")
  if (!name) {
    return id
  }

  return (
    name
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ") + (type ? ` (${type.toUpperCase()})` : "")
  )
}
