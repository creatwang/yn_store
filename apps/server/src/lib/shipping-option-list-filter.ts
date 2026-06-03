import { and, inArray, isNull, sql } from "drizzle-orm"
import type { AdminGetShippingOptionsParamsType } from "@my-store/validators/admin-list-params"
import {
  fulfillmentSet,
  getDb,
  serviceZone,
  shippingOptionRule,
} from "@my-store/db"

function sqlRows(result: unknown): Record<string, unknown>[] {
  return (Array.isArray(result)
    ? result
    : ((result as { rows?: Record<string, unknown>[] }).rows ?? [])) as Record<
    string,
    unknown
  >[]
}

function ruleValueIsTrue(value: unknown) {
  return String(value).toLowerCase() === "true"
}

async function zoneIdsForStockLocation(locationId: string) {
  const db = getDb()
  const sets = await db
    .select({ id: fulfillmentSet.id })
    .from(fulfillmentSet)
    .where(
      and(
        isNull(fulfillmentSet.deleted_at),
        sql`${fulfillmentSet.metadata}->>'location_id' = ${locationId}`,
      ),
    )
  if (!sets.length) return [] as string[]

  const zones = await db
    .select({ id: serviceZone.id })
    .from(serviceZone)
    .where(
      inArray(
        serviceZone.fulfillment_set_id,
        sets.map((s) => s.id),
      ),
    )
  return zones.map((z) => z.id)
}

async function loadRulesByOptionIds(optionIds: string[]) {
  const map = new Map<string, typeof shippingOptionRule.$inferSelect[]>()
  if (!optionIds.length) return map

  const db = getDb()
  const rules = await db
    .select()
    .from(shippingOptionRule)
    .where(inArray(shippingOptionRule.shipping_option_id, optionIds))

  for (const rule of rules) {
    const list = map.get(rule.shipping_option_id) ?? []
    list.push(rule)
    map.set(rule.shipping_option_id, list)
  }
  return map
}

function matchesBooleanRule(
  rules: typeof shippingOptionRule.$inferSelect[],
  attribute: string,
  expected: boolean,
) {
  const hit = rules.find((r) => r.attribute === attribute)
  if (!hit) {
    return attribute === "is_return" ? !expected : expected
  }
  return ruleValueIsTrue(hit.value) === expected
}

function passesRuleFilters(
  rules: typeof shippingOptionRule.$inferSelect[],
  query: AdminGetShippingOptionsParamsType,
) {
  if (query.is_return != null) {
    if (!matchesBooleanRule(rules, "is_return", query.is_return)) return false
  }
  if (query.admin_only != null) {
    const adminOnlyRule = rules.find((r) => r.attribute === "admin_only")
    if (adminOnlyRule) {
      if (ruleValueIsTrue(adminOnlyRule.value) !== query.admin_only) return false
    } else if (!matchesBooleanRule(rules, "enabled_in_store", !query.admin_only)) {
      return false
    }
  }
  return true
}

const SHIPPING_OPTION_COLS =
  "id, name, price_type, data, metadata, service_zone_id, provider_id, shipping_profile_id, shipping_option_type_id, created_at, updated_at, deleted_at"

export async function listShippingOptionRowsFiltered(
  query: AdminGetShippingOptionsParamsType,
  pagination: { limit: number; offset: number },
) {
  const db = getDb()
  const conditions: ReturnType<typeof sql>[] = [sql`deleted_at IS NULL`]

  if (typeof query.q === "string" && query.q.trim()) {
    const term = `%${query.q.trim()}%`
    conditions.push(sql`name ILIKE ${term}`)
  }

  const idList = query.id
    ? Array.isArray(query.id)
      ? query.id
      : [query.id]
    : null
  if (idList?.length) {
    conditions.push(
      sql`id IN (${sql.join(
        idList.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    )
  }

  const zoneFilterIds: string[] = []
  if (query.service_zone_id) {
    const z = Array.isArray(query.service_zone_id)
      ? query.service_zone_id
      : [query.service_zone_id]
    zoneFilterIds.push(...z)
  }
  if (query.stock_location_id) {
    const locId = Array.isArray(query.stock_location_id)
      ? query.stock_location_id[0]
      : query.stock_location_id
    if (locId) {
      const fromLoc = await zoneIdsForStockLocation(locId)
      zoneFilterIds.push(...fromLoc)
    }
  }
  if (zoneFilterIds.length) {
    const uniqueZones = [...new Set(zoneFilterIds)]
    conditions.push(
      sql`service_zone_id IN (${sql.join(
        uniqueZones.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    )
  }

  if (query.shipping_profile_id) {
    const ids = Array.isArray(query.shipping_profile_id)
      ? query.shipping_profile_id
      : [query.shipping_profile_id]
    conditions.push(
      sql`shipping_profile_id IN (${sql.join(
        ids.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    )
  }

  if (query.provider_id) {
    const ids = Array.isArray(query.provider_id)
      ? query.provider_id
      : [query.provider_id]
    conditions.push(
      sql`provider_id IN (${sql.join(
        ids.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    )
  }

  const whereSql = sql.join(conditions, sql` AND `)
  const allRows = sqlRows(
    await db.execute(sql`
      SELECT ${sql.raw(SHIPPING_OPTION_COLS)}
      FROM shipping_option
      WHERE ${whereSql}
      ORDER BY created_at DESC
    `),
  )

  const needsRuleFilter =
    query.is_return != null || query.admin_only != null
  let filtered = allRows
  if (needsRuleFilter) {
    const rulesMap = await loadRulesByOptionIds(
      allRows.map((r) => String(r.id)),
    )
    filtered = allRows.filter((row) => {
      const rules = rulesMap.get(String(row.id)) ?? []
      return passesRuleFilters(rules, query)
    })
  }

  const total = filtered.length
  const page = filtered.slice(
    pagination.offset,
    pagination.offset + pagination.limit,
  )

  return { rows: page, total }
}
