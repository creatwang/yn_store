/**
 * 解析 Admin orders `fields` 参数，对齐 Medusa get-orders-list workflow 行为。
 */
export function parseOrderFields(fieldsParam?: string): string[] {
  if (!fieldsParam?.trim()) return []
  return fieldsParam.split(",").map((f) => f.trim()).filter(Boolean)
}

export type OrderFieldsConfig = {
  /** 原始 fields 列表；空数组表示未传 fields（使用官方 list 默认字段集） */
  fields: string[]
  wantsPaymentCollections: boolean
  wantsFulfillments: boolean
  wantsCustomer: boolean
  wantsSalesChannel: boolean
  wantsSummary: boolean
  wantsTotal: boolean
}

/** 官方 listTransformQueryConfig.defaults */
export const DEFAULT_ADMIN_ORDER_LIST_FIELDS = [
  "id",
  "display_id",
  "custom_display_id",
  "status",
  "version",
  "summary",
  "total",
  "metadata",
  "locale",
  "created_at",
  "updated_at",
] as const

/** 对齐 defaultAdminRetrieveOrderFields 中与状态/详情相关的子集 */
export const DEFAULT_ADMIN_ORDER_RETRIEVE_FIELDS = [
  ...DEFAULT_ADMIN_ORDER_LIST_FIELDS,
  "email",
  "currency_code",
  "region_id",
  "sales_channel_id",
  "customer_id",
  "*customer",
  "*sales_channel",
  "*payment_collections",
  "*fulfillments",
].join(",")

function includesRelation(fields: string[], relation: string): boolean {
  return fields.some(
    (f) =>
      f === relation ||
      f.startsWith(`*${relation}`) ||
      f.includes(`${relation}.`),
  )
}

export function resolveOrderFieldsConfig(fieldsParam?: string): OrderFieldsConfig {
  const parsed = parseOrderFields(fieldsParam)
  const fields =
    parsed.length > 0 ? parsed : [...DEFAULT_ADMIN_ORDER_LIST_FIELDS]

  return {
    fields,
    wantsPaymentCollections: includesRelation(fields, "payment_collections"),
    wantsFulfillments: includesRelation(fields, "fulfillments"),
    wantsCustomer: includesRelation(fields, "customer"),
    wantsSalesChannel: includesRelation(fields, "sales_channel"),
    wantsSummary: fields.includes("summary"),
    wantsTotal: fields.includes("total"),
  }
}

export function applyOrderFieldMask<
  T extends Record<string, unknown>,
>(order: T, config: OrderFieldsConfig): T {
  const result = { ...order }

  if (!config.wantsPaymentCollections) {
    delete result.payment_collections
  }
  if (!config.wantsFulfillments) {
    delete result.fulfillments
  }
  if (!config.wantsCustomer) {
    delete result.customer
  }
  if (!config.wantsSalesChannel) {
    delete result.sales_channel
  }
  if (!config.wantsSummary) {
    delete result.summary
  }

  return result
}
