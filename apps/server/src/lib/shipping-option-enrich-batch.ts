import { and, eq, inArray, isNull, sql } from "drizzle-orm"
import {
  fulfillmentSet,
  price,
  priceRule,
  serviceZone,
  shippingOptionRule,
  shippingOptionType,
  shippingProfile,
} from "@my-store/db"
import type { getDb } from "@my-store/db"

type Db = ReturnType<typeof getDb>

function sqlRows(result: unknown): Record<string, unknown>[] {
  return (Array.isArray(result)
    ? result
    : ((result as { rows?: Record<string, unknown>[] }).rows ?? [])) as Record<
    string,
    unknown
  >[]
}

function uniqueStrings(values: Array<string | undefined | null>) {
  return [...new Set(values.filter((v): v is string => Boolean(v)))]
}

async function loadPricesGroupedByShippingOptionId(
  db: Db,
  shippingOptionIds: string[],
) {
  const map = new Map<string, Array<Record<string, unknown>>>()
  if (shippingOptionIds.length === 0) return map

  const links = sqlRows(
    await db.execute(sql`
      SELECT shipping_option_id, price_set_id
      FROM shipping_option_price_set
      WHERE shipping_option_id IN (${sql.join(
        shippingOptionIds.map((id) => sql`${id}`),
        sql`, `,
      )})
    `),
  )

  const priceSetIds = uniqueStrings(
    links.map((l) => String(l.price_set_id)),
  )
  if (priceSetIds.length === 0) return map

  const priceRows = await db
    .select()
    .from(price)
    .where(and(inArray(price.price_set_id, priceSetIds), isNull(price.deleted_at)))

  const priceIds = priceRows.map((r) => r.id)
  const ruleRows =
    priceIds.length > 0
      ? await db
          .select()
          .from(priceRule)
          .where(inArray(priceRule.price_id, priceIds))
      : []

  const rulesByPriceId = new Map<string, typeof ruleRows>()
  for (const rule of ruleRows) {
    const list = rulesByPriceId.get(rule.price_id) ?? []
    list.push(rule)
    rulesByPriceId.set(rule.price_id, list)
  }

  const pricesBySetId = new Map<string, Array<Record<string, unknown>>>()
  for (const row of priceRows) {
    const list = pricesBySetId.get(row.price_set_id) ?? []
    list.push({
      ...row,
      price_rules: rulesByPriceId.get(row.id) ?? [],
    })
    pricesBySetId.set(row.price_set_id, list)
  }

  for (const link of links) {
    const optionId = String(link.shipping_option_id)
    const setId = String(link.price_set_id)
    const list = map.get(optionId) ?? []
    list.push(...(pricesBySetId.get(setId) ?? []))
    map.set(optionId, list)
  }

  return map
}

/**
 * 批量 enrich shipping_option（固定少量 round-trip，避免 N×M 嵌套查询打满连接池）
 */
export async function enrichShippingOptionsBatch(
  db: Db,
  options: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  if (options.length === 0) return []

  const optionIds = options.map((o) => String(o.id))
  const zoneIds = uniqueStrings(
    options.map((o) => String(o.service_zone_id ?? "")),
  )
  const profileIds = uniqueStrings(
    options.map((o) => String(o.shipping_profile_id ?? "")),
  )
  const typeIds = uniqueStrings(
    options.map((o) => {
      const meta = (o.metadata ?? {}) as Record<string, unknown>
      return (
        (o.shipping_option_type_id as string | undefined) ??
        (o.type_id as string | undefined) ??
        (meta.type_id as string | undefined)
      )
    }),
  )

  const [zones, profiles, types, rules, pricesByOption] = await Promise.all([
    zoneIds.length
      ? db.select().from(serviceZone).where(inArray(serviceZone.id, zoneIds))
      : Promise.resolve([]),
    profileIds.length
      ? db
          .select()
          .from(shippingProfile)
          .where(inArray(shippingProfile.id, profileIds))
      : Promise.resolve([]),
    typeIds.length
      ? db
          .select()
          .from(shippingOptionType)
          .where(inArray(shippingOptionType.id, typeIds))
      : Promise.resolve([]),
    db
      .select()
      .from(shippingOptionRule)
      .where(inArray(shippingOptionRule.shipping_option_id, optionIds)),
    loadPricesGroupedByShippingOptionId(db, optionIds),
  ])

  const zoneById = new Map(zones.map((z) => [z.id, z]))
  const profileById = new Map(profiles.map((p) => [p.id, p]))
  const typeById = new Map(types.map((t) => [t.id, t]))

  const fulfillmentSetIds = uniqueStrings(
    zones.map((z) => z.fulfillment_set_id),
  )
  const fulfillmentSets =
    fulfillmentSetIds.length > 0
      ? await db
          .select()
          .from(fulfillmentSet)
          .where(inArray(fulfillmentSet.id, fulfillmentSetIds))
      : []
  const fsById = new Map(fulfillmentSets.map((fs) => [fs.id, fs]))

  const rulesByOptionId = new Map<string, typeof rules>()
  for (const rule of rules) {
    const list = rulesByOptionId.get(rule.shipping_option_id) ?? []
    list.push(rule)
    rulesByOptionId.set(rule.shipping_option_id, list)
  }

  return options.map((option) => {
    const meta = (option.metadata ?? {}) as Record<string, unknown>
    const typeId =
      (option.shipping_option_type_id as string | undefined) ??
      (option.type_id as string | undefined) ??
      (meta.type_id as string | undefined)

    const zone = zoneById.get(String(option.service_zone_id))
    if (!zone) {
      return { ...option, service_zone: null }
    }

    const fs = fsById.get(zone.fulfillment_set_id) ?? null
    const shipping_profile = option.shipping_profile_id
      ? (profileById.get(String(option.shipping_profile_id)) ?? null)
      : null
    const type = typeId
      ? (typeById.get(typeId) ?? { id: typeId, label: "", code: "" })
      : null
    const price_type =
      (option.price_type as string | undefined) ??
      (meta.price_type as string | undefined) ??
      "flat"

    return {
      ...option,
      type_id: typeId,
      type,
      price_type,
      rules: rulesByOptionId.get(String(option.id)) ?? [],
      prices: pricesByOption.get(String(option.id)) ?? [],
      shipping_profile,
      service_zone: {
        ...zone,
        fulfillment_set: fs,
      },
    }
  })
}
