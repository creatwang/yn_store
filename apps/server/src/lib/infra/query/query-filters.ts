import { eq, gt, gte, inArray, lt, lte } from "drizzle-orm"

/** 将 query 中的 id 筛选规范为 string[]（支持逗号分隔或数组） */
export function normalizeIdFilter(
  value: string | string[] | undefined,
): string[] | undefined {
  if (value == null || value === "") return undefined
  const parts = (Array.isArray(value) ? value : [value])
    .flatMap((v) => String(v).split(","))
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.length ? parts : undefined
}

export function asArray<T>(value: T | T[] | undefined | null): T[] | undefined {
  if (value == null) return undefined
  return Array.isArray(value) ? value : [value]
}

export type OperatorMapValue =
  | string
  | string[]
  | {
      $eq?: string | string[]
      $in?: string[]
      $gte?: string
      $lte?: string
      $gt?: string
      $lt?: string
    }

/** 官方 list query：string | string[] | createOperatorMap */
export function normalizeFilterIds(
  value: OperatorMapValue | undefined,
): string[] | undefined {
  if (value == null) return undefined
  if (typeof value === "string") return [value]
  if (Array.isArray(value)) return value
  if (typeof value === "object") {
    if (value.$in?.length) return value.$in
    if (value.$eq != null) return asArray(value.$eq)
  }
  return undefined
}

export function applyInArrayCondition(
  col: Parameters<typeof eq>[0],
  value: string | string[] | OperatorMapValue | undefined,
  conditions: unknown[],
) {
  const ids = normalizeFilterIds(
    value as OperatorMapValue | undefined,
  ) ?? normalizeIdFilter(value as string | string[] | undefined)
  if (!ids?.length) return
  if (ids.length === 1) {
    conditions.push(eq(col, ids[0]))
  } else {
    conditions.push(inArray(col, ids))
  }
}

export type DateRange = {
  $eq?: string
  $gte?: string
  $lte?: string
  $gt?: string
  $lt?: string
}

export function asDateRange(value: unknown): DateRange | undefined {
  if (value == null || typeof value !== "object") return undefined
  return value as DateRange
}

export function applyDateRangeConditions(
  col: unknown,
  range: DateRange | undefined,
  conditions: unknown[],
  sql: typeof import("drizzle-orm").sql,
) {
  if (!range) return
  if (range.$eq) {
    conditions.push(sql`${col} = ${range.$eq}::timestamp`)
  }
  if (range.$gte) {
    conditions.push(sql`${col} >= ${range.$gte}::timestamp`)
  }
  if (range.$lte) {
    conditions.push(sql`${col} <= ${range.$lte}::timestamp`)
  }
  if (range.$gt) {
    conditions.push(sql`${col} > ${range.$gt}::timestamp`)
  }
  if (range.$lt) {
    conditions.push(sql`${col} < ${range.$lt}::timestamp`)
  }
}

/** AdminGetOrdersParams transform → summary.totals.current_order_total */
export function applyOrderTotalSummaryFilter(
  orderIdCol: unknown,
  totalFilter: DateRange | undefined,
  conditions: unknown[],
  sql: typeof import("drizzle-orm").sql,
) {
  if (!totalFilter) return
  const parts: unknown[] = []
  if (totalFilter.$eq != null) {
    parts.push(
      sql`(os.totals->>'current_order_total')::numeric = ${totalFilter.$eq}::numeric`,
    )
  }
  if (totalFilter.$gte != null) {
    parts.push(
      sql`(os.totals->>'current_order_total')::numeric >= ${totalFilter.$gte}::numeric`,
    )
  }
  if (totalFilter.$lte != null) {
    parts.push(
      sql`(os.totals->>'current_order_total')::numeric <= ${totalFilter.$lte}::numeric`,
    )
  }
  if (totalFilter.$gt != null) {
    parts.push(
      sql`(os.totals->>'current_order_total')::numeric > ${totalFilter.$gt}::numeric`,
    )
  }
  if (totalFilter.$lt != null) {
    parts.push(
      sql`(os.totals->>'current_order_total')::numeric < ${totalFilter.$lt}::numeric`,
    )
  }
  if (!parts.length) return
  conditions.push(
    sql`exists (
      select 1 from order_summary os
      where os.order_id = ${orderIdCol}
      and ${sql.join(parts as Parameters<typeof sql.join>[0], sql` and `)}
    )`,
  )
}

type NumberOperatorMap = {
  $eq?: number
  $gte?: number
  $lte?: number
  $gt?: number
  $lt?: number
}

export function asNumberOperatorMap(
  value: unknown,
): NumberOperatorMap | undefined {
  if (value == null) return undefined
  if (typeof value === "number") return { $eq: value }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as NumberOperatorMap
  }
  return undefined
}

export function applyNumberOperatorConditions(
  col: Parameters<typeof eq>[0],
  value: unknown,
  conditions: unknown[],
) {
  const map = asNumberOperatorMap(value)
  if (!map) return
  if (map.$eq != null) conditions.push(eq(col, map.$eq))
  if (map.$gte != null) conditions.push(gte(col, map.$gte))
  if (map.$lte != null) conditions.push(lte(col, map.$lte))
  if (map.$gt != null) conditions.push(gt(col, map.$gt))
  if (map.$lt != null) conditions.push(lt(col, map.$lt))
}

export function listLimitOffset(query: {
  limit?: number
  offset?: number
},
defaults: { limit: number; offset: number } = { limit: 50, offset: 0 },
) {
  return {
    limit: query.limit ?? defaults.limit,
    offset: query.offset ?? defaults.offset,
  }
}
