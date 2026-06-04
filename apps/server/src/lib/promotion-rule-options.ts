import { and, ilike, isNull } from "drizzle-orm"
import { getDb, customerGroup, product, region, salesChannel } from "@my-store/db"
import { listLimitOffset } from "./query-filters"

const OPERATORS = {
  eq: { id: "eq", value: "eq", label: "Equal" },
  ne: { id: "ne", value: "ne", label: "Not equal" },
  in: { id: "in", value: "in", label: "In" },
  gte: { id: "gte", value: "gte", label: "Greater than or equal" },
  lte: { id: "lte", value: "lte", label: "Less than or equal" },
}

type RuleAttr = {
  id: string
  value: string
  label: string
  field_type: "select" | "multiselect" | "text" | "number"
  operators: (typeof OPERATORS)[keyof typeof OPERATORS][]
}

const PROMOTION_RULE_ATTRIBUTES: RuleAttr[] = [
  {
    id: "customer_group_id",
    value: "customer_group_id",
    label: "Customer Group",
    field_type: "multiselect",
    operators: [OPERATORS.in, OPERATORS.eq],
  },
  {
    id: "region_id",
    value: "region_id",
    label: "Region",
    field_type: "multiselect",
    operators: [OPERATORS.in, OPERATORS.eq],
  },
  {
    id: "sales_channel_id",
    value: "sales_channel_id",
    label: "Sales Channel",
    field_type: "multiselect",
    operators: [OPERATORS.in, OPERATORS.eq],
  },
  {
    id: "currency_code",
    value: "currency_code",
    label: "Currency",
    field_type: "multiselect",
    operators: [OPERATORS.in, OPERATORS.eq],
  },
]

const TARGET_RULE_ATTRIBUTES: RuleAttr[] = [
  {
    id: "items.product.id",
    value: "items.product.id",
    label: "Product",
    field_type: "multiselect",
    operators: [OPERATORS.in, OPERATORS.eq],
  },
  {
    id: "items.product.collection_id",
    value: "items.product.collection_id",
    label: "Collection",
    field_type: "multiselect",
    operators: [OPERATORS.in, OPERATORS.eq],
  },
]

const BUY_RULE_ATTRIBUTES: RuleAttr[] = [
  {
    id: "items.product.id",
    value: "items.product.id",
    label: "Product",
    field_type: "multiselect",
    operators: [OPERATORS.in, OPERATORS.eq],
  },
]

export function listPromotionRuleAttributeOptions(ruleType: string) {
  if (ruleType === "target-rules") {
    return { attributes: TARGET_RULE_ATTRIBUTES }
  }
  if (ruleType === "buy-rules") {
    return { attributes: BUY_RULE_ATTRIBUTES }
  }
  return { attributes: PROMOTION_RULE_ATTRIBUTES }
}

export async function listPromotionRuleValueOptions(
  ruleAttributeId: string,
  query: Record<string, unknown>,
) {
  const db = getDb()
  const { limit, offset } = listLimitOffset(
    query as { limit?: number; offset?: number },
    { limit: 50, offset: 0 },
  )
  const q =
    typeof query.q === "string" && query.q.trim()
      ? `%${query.q.trim()}%`
      : undefined

  const mapRows = (rows: { id: string; label: string }[]) => ({
    values: rows.map((r) => ({ label: r.label, value: r.id })),
    count: rows.length,
    limit,
    offset,
  })

  if (
    ruleAttributeId === "customer_group_id" ||
    ruleAttributeId === "customer_group"
  ) {
    const conditions = [isNull(customerGroup.deleted_at)]
    if (q) conditions.push(ilike(customerGroup.name, q))
    const rows = await db
      .select({ id: customerGroup.id, label: customerGroup.name })
      .from(customerGroup)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
    return mapRows(rows.map((r) => ({ id: r.id, label: r.label ?? r.id })))
  }

  if (ruleAttributeId === "region_id" || ruleAttributeId === "region") {
    const conditions = [isNull(region.deleted_at)]
    if (q) conditions.push(ilike(region.name, q))
    const rows = await db
      .select({ id: region.id, label: region.name })
      .from(region)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
    return mapRows(rows.map((r) => ({ id: r.id, label: r.label ?? r.id })))
  }

  if (
    ruleAttributeId === "sales_channel_id" ||
    ruleAttributeId === "sales_channel"
  ) {
    const conditions = [isNull(salesChannel.deleted_at)]
    if (q) conditions.push(ilike(salesChannel.name, q))
    const rows = await db
      .select({ id: salesChannel.id, label: salesChannel.name })
      .from(salesChannel)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
    return mapRows(rows.map((r) => ({ id: r.id, label: r.label ?? r.id })))
  }

  if (
    ruleAttributeId === "items.product.id" ||
    ruleAttributeId === "product" ||
    ruleAttributeId === "product_id"
  ) {
    const conditions = [isNull(product.deleted_at)]
    if (q) conditions.push(ilike(product.title, q))
    const rows = await db
      .select({ id: product.id, label: product.title })
      .from(product)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
    return mapRows(rows.map((r) => ({ id: r.id, label: r.label ?? r.id })))
  }

  if (ruleAttributeId === "currency_code") {
    const codes = (
      (query.value as string[] | undefined) ??
      ["usd", "eur", "gbp"]
    ).map((c) => String(c).toLowerCase())
    const filtered = q
      ? codes.filter((c) => c.includes(q.replace(/%/g, "").toLowerCase()))
      : codes
    return {
      values: filtered.map((c) => ({
        label: c.toUpperCase(),
        value: c,
      })),
      count: filtered.length,
      limit,
      offset,
    }
  }

  return { values: [], count: 0, limit, offset }
}
