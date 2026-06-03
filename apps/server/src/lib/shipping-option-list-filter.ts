import { sql } from "drizzle-orm"
import { getDb } from "@my-store/db"
import type { AdminGetShippingOptionsParamsType } from "@my-store/validators/admin-list-params"
import { normalizeFilterIds } from "./query-filters"

const SHIPPING_OPTION_COLS =
  "id, name, price_type, data, metadata, service_zone_id, provider_id, shipping_profile_id, shipping_option_type_id, created_at, updated_at, deleted_at"

function sqlRows(result: unknown): Record<string, unknown>[] {
  return (Array.isArray(result)
    ? result
    : ((result as { rows?: Record<string, unknown>[] }).rows ?? [])) as Record<
    string,
    unknown
  >[]
}

function parseBoolFilter(
  value: boolean | string | undefined,
): boolean | undefined {
  if (value === undefined) return undefined
  if (typeof value === "boolean") return value
  if (value === "true") return true
  if (value === "false") return false
  return undefined
}

/** EXISTS rule attribute=… operator=eq value in ('true','1') */
function ruleFlagCondition(attribute: string, expectTrue: boolean) {
  const exists = sql`EXISTS (
    SELECT 1 FROM shipping_option_rule r
    WHERE r.shipping_option_id = shipping_option.id
      AND r.attribute = ${attribute}
      AND r.operator = 'eq'
      AND r.value IN ('true', '1')
  )`
  return expectTrue ? exists : sql`NOT (${exists})`
}

async function serviceZoneIdsForStockLocations(
  locationIds: string[],
): Promise<string[]> {
  if (locationIds.length === 0) return []
  const db = getDb()
  const rows = sqlRows(
    await db.execute(sql`
      SELECT sz.id
      FROM service_zone sz
      INNER JOIN fulfillment_set fs ON fs.id = sz.fulfillment_set_id
      WHERE fs.metadata->>'location_id' IN (${sql.join(
        locationIds.map((id) => sql`${id}`),
        sql`, `,
      )})
    `),
  )
  return rows.map((r) => String(r.id))
}

function pushInFilter(
  conditions: ReturnType<typeof sql>[],
  column: string,
  ids: string[] | undefined,
) {
  if (!ids?.length) return
  if (ids.length === 1) {
    conditions.push(sql`${sql.raw(column)} = ${ids[0]}`)
    return
  }
  conditions.push(
    sql`${sql.raw(column)} IN (${sql.join(
      ids.map((id) => sql`${id}`),
      sql`, `,
    )})`,
  )
}

export async function listShippingOptionRowsFiltered(
  query: AdminGetShippingOptionsParamsType,
  paging: { limit: number; offset: number },
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  const db = getDb()
  const conditions: ReturnType<typeof sql>[] = [sql`deleted_at IS NULL`]

  pushInFilter(conditions, "id", normalizeFilterIds(query.id))
  pushInFilter(
    conditions,
    "service_zone_id",
    normalizeFilterIds(query.service_zone_id),
  )
  pushInFilter(
    conditions,
    "shipping_profile_id",
    normalizeFilterIds(query.shipping_profile_id),
  )
  pushInFilter(conditions, "provider_id", normalizeFilterIds(query.provider_id))
  pushInFilter(
    conditions,
    "shipping_option_type_id",
    normalizeFilterIds(query.shipping_option_type_id),
  )

  const stockIds = normalizeFilterIds(query.stock_location_id)
  if (stockIds?.length) {
    const zoneIds = await serviceZoneIdsForStockLocations(stockIds)
    if (zoneIds.length === 0) {
      return { rows: [], total: 0 }
    }
    pushInFilter(conditions, "service_zone_id", zoneIds)
  }

  if (query.q?.trim()) {
    conditions.push(sql`name ILIKE ${`%${query.q.trim()}%`}`)
  }

  const isReturn = parseBoolFilter(query.is_return as boolean | string | undefined)
  if (isReturn !== undefined) {
    conditions.push(ruleFlagCondition("is_return", isReturn))
  }

  const adminOnly = parseBoolFilter(
    query.admin_only as boolean | string | undefined,
  )
  if (adminOnly !== undefined) {
    conditions.push(ruleFlagCondition("enabled_in_store", !adminOnly))
  }

  const where = sql.join(conditions, sql` AND `)

  const countRows = sqlRows(
    await db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM shipping_option
      WHERE ${where}
    `),
  )
  const total = Number(countRows[0]?.total ?? 0)

  const rows = sqlRows(
    await db.execute(sql`
      SELECT ${sql.raw(SHIPPING_OPTION_COLS)}
      FROM shipping_option
      WHERE ${where}
      ORDER BY created_at DESC
      LIMIT ${paging.limit} OFFSET ${paging.offset}
    `),
  )

  return { rows, total }
}
