import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm"
import type {
  AdminGetShippingOptionsParamsType,
  AdminGetStockLocationsParamsType,
} from "@my-store/validators/admin-list-params"
import { listLimitOffset } from "../lib/query-filters"
import {
  generateId,
  getDb,
  stockLocation,
  fulfillmentSet,
  serviceZone,
  geoZone,
  shippingOptionRule,
  shippingProfile,
  shippingOptionType,
  salesChannel,
  priceSet,
  price,
  priceRule,
} from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import { enrichShippingOptionsBatch } from "../lib/shipping-option-enrich-batch"

function sqlRows(result: unknown): Record<string, unknown>[] {
  return (Array.isArray(result) ? result : ((result as { rows?: Record<string, unknown>[] }).rows ?? [])) as Record<string, unknown>[]
}

/** 线上库 shipping_option 列与 Drizzle schema 不一致，统一 raw SQL */
const SHIPPING_OPTION_COLS =
  "id, name, price_type, data, metadata, service_zone_id, provider_id, shipping_profile_id, shipping_option_type_id, created_at, updated_at, deleted_at"

async function loadShippingOptionsForZones(zoneIds: string[]) {
  if (zoneIds.length === 0) return []
  const db = getDb()
  return sqlRows(
    await db.execute(sql`
      SELECT ${sql.raw(SHIPPING_OPTION_COLS)}
      FROM shipping_option
      WHERE deleted_at IS NULL
        AND service_zone_id IN (${sql.join(
          zoneIds.map((id) => sql`${id}`),
          sql`, `,
        )})
    `),
  )
}

async function loadShippingOptionById(id: string) {
  const db = getDb()
  const rows = sqlRows(
    await db.execute(sql`
      SELECT ${sql.raw(SHIPPING_OPTION_COLS)}
      FROM shipping_option
      WHERE deleted_at IS NULL AND id = ${id}
      LIMIT 1
    `),
  )
  return rows[0] ?? null
}

async function countShippingOptions() {
  const db = getDb()
  const rows = sqlRows(
    await db.execute(sql`
      SELECT COUNT(*)::int AS total FROM shipping_option WHERE deleted_at IS NULL
    `),
  )
  return Number(rows[0]?.total ?? 0)
}

async function insertShippingOptionRow(values: {
  id: string
  name: string
  price_type: string
  service_zone_id: string
  provider_id: string | null
  shipping_profile_id: string | null
  shipping_option_type_id: string
  data: Record<string, unknown>
  metadata: Record<string, unknown>
}) {
  const db = getDb()
  await db.execute(sql`
    INSERT INTO shipping_option (
      id, name, price_type, service_zone_id, shipping_profile_id, provider_id,
      shipping_option_type_id, data, metadata, created_at, updated_at
    )
    VALUES (
      ${values.id}, ${values.name}, ${values.price_type}, ${values.service_zone_id},
      ${values.shipping_profile_id}, ${values.provider_id}, ${values.shipping_option_type_id},
      ${JSON.stringify(values.data)}::jsonb, ${JSON.stringify(values.metadata)}::jsonb,
      now(), now()
    )
  `)
  return loadShippingOptionById(values.id)
}

function ruleValue(value: unknown) {
  if (value == null) return null
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value
  }
  return value
}

function metaIds(metadata: unknown, ...keys: string[]) {
  const meta = (metadata ?? {}) as Record<string, unknown>
  for (const key of keys) {
    const val = meta[key]
    if (Array.isArray(val) && val.length) return val as string[]
  }
  return [] as string[]
}

export async function enrichShippingOptionRow(option: Record<string, unknown>) {
  const db = getDb()
  const [enriched] = await enrichShippingOptionsBatch(db, [option])
  return enriched ?? { ...option, service_zone: null }
}

async function loadFulfillmentSetsForLocation(locationId: string, full: boolean) {
  const db = getDb()
  const sets = await db
    .select()
    .from(fulfillmentSet)
    .where(sql`${fulfillmentSet.metadata}->>'location_id' = ${locationId}`)

  if (sets.length === 0) return []

  const setIds = sets.map((s) => s.id)
  const zones = await db
    .select()
    .from(serviceZone)
    .where(inArray(serviceZone.fulfillment_set_id, setIds))

  const zoneIds = zones.map((z) => z.id)
  const geoRows =
    zoneIds.length > 0
      ? await db
          .select()
          .from(geoZone)
          .where(inArray(geoZone.service_zone_id, zoneIds))
      : []

  const geoByZoneId = new Map<string, typeof geoRows>()
  for (const row of geoRows) {
    const list = geoByZoneId.get(row.service_zone_id) ?? []
    list.push(row)
    geoByZoneId.set(row.service_zone_id, list)
  }

  let enrichedOptionsByZoneId = new Map<string, Record<string, unknown>[]>()
  if (full && zoneIds.length > 0) {
    const rawOptions = await loadShippingOptionsForZones(zoneIds)
    const enriched = await enrichShippingOptionsBatch(db, rawOptions)
    for (const opt of enriched) {
      const zoneId = String(opt.service_zone_id)
      const list = enrichedOptionsByZoneId.get(zoneId) ?? []
      list.push(opt)
      enrichedOptionsByZoneId.set(zoneId, list)
    }
  }

  const zonesBySetId = new Map<string, typeof zones>()
  for (const zone of zones) {
    const list = zonesBySetId.get(zone.fulfillment_set_id) ?? []
    list.push(zone)
    zonesBySetId.set(zone.fulfillment_set_id, list)
  }

  return sets.map((fs) => ({
    ...fs,
    service_zones: (zonesBySetId.get(fs.id) ?? []).map((zone) => ({
      ...zone,
      geo_zones: geoByZoneId.get(zone.id) ?? [],
      shipping_options: full
        ? (enrichedOptionsByZoneId.get(zone.id) ?? [])
        : [],
    })),
  }))
}

async function loadSalesChannels(metadata: unknown) {
  const ids = metaIds(metadata, "sales_channel_ids", "salesChannelIds")
  if (!ids.length) return []
  const db = getDb()
  return db
    .select()
    .from(salesChannel)
    .where(and(inArray(salesChannel.id, ids), isNull(salesChannel.deleted_at)))
}

async function loadFulfillmentProviders(metadata: unknown) {
  const ids = metaIds(metadata, "fulfillment_provider_ids", "providerIds", "fulfillmentProviderIds")
  return ids.map((id) => ({ id, is_enabled: true }))
}

function mergeLinkedIds(current: string[], add: string[] = [], remove: string[] = []) {
  const set = new Set(current)
  for (const id of remove) set.delete(id)
  for (const id of add) set.add(id)
  return [...set]
}

async function updateLocationMetadataIds(
  id: string,
  key: string,
  altKeys: string[],
  body: { add?: string[]; remove?: string[] },
) {
  const db = getDb()
  const [loc] = await db
    .select()
    .from(stockLocation)
    .where(and(eq(stockLocation.id, id), isNull(stockLocation.deleted_at)))
    .limit(1)
  if (!loc) throw new HTTPException(404, { message: "未找到" })

  const current = metaIds(loc.metadata, key, ...altKeys)
  const next = mergeLinkedIds(current, body.add ?? [], body.remove ?? [])
  const metadata = {
    ...((loc.metadata as Record<string, unknown> | null) ?? {}),
    [key]: next,
  }

  const [updated] = await db
    .update(stockLocation)
    .set({ metadata, updated_at: sql`now()` })
    .where(eq(stockLocation.id, id))
    .returning()

  return { stock_location: await enrichStockLocation(updated, true) }
}

async function enrichStockLocation(loc: typeof stockLocation.$inferSelect, full: boolean) {
  const fulfillment_sets = await loadFulfillmentSetsForLocation(loc.id, full)
  const sales_channels = await loadSalesChannels(loc.metadata)
  const fulfillment_providers = await loadFulfillmentProviders(loc.metadata)
  return {
    ...loc,
    fulfillment_sets,
    sales_channels,
    fulfillment_providers,
  }
}

export const stockLocationService = {
  async list(query: AdminGetStockLocationsParamsType) {
    const db = getDb()
    const { limit, offset } = listLimitOffset(query, { limit: 50, offset: 0 })
    const where = isNull(stockLocation.deleted_at)
    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(stockLocation)
        .where(where)
        .orderBy(desc(stockLocation.created_at))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(stockLocation).where(where),
    ])
    return {
      stock_locations: rows,
      count: Number(total),
      limit,
      offset,
    }
  },

  async getById(id: string) {
    const db = getDb()
    const [item] = await db
      .select()
      .from(stockLocation)
      .where(and(eq(stockLocation.id, id), isNull(stockLocation.deleted_at)))
      .limit(1)
    if (!item) throw new HTTPException(404, { message: "未找到" })
    return { stock_location: await enrichStockLocation(item, true) }
  },

  async create(input: Record<string, unknown>) {
    const db = getDb()
    const id = generateId("sloc")
    const [created] = await db
      .insert(stockLocation)
      .values({
        id,
        name: String(input.name ?? "Location"),
        metadata: (input.metadata as Record<string, unknown> | null | undefined) ?? null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning()
    return { stock_location: await enrichStockLocation(created, true) }
  },

  async update(id: string, input: Record<string, unknown>) {
    const db = getDb()
    const [updated] = await db
      .update(stockLocation)
      .set({ ...input, updated_at: sql`now()` })
      .where(and(eq(stockLocation.id, id), isNull(stockLocation.deleted_at)))
      .returning()
    if (!updated) throw new HTTPException(404, { message: "未找到" })
    return { stock_location: await enrichStockLocation(updated, true) }
  },

  async delete(id: string) {
    const db = getDb()
    await db
      .update(stockLocation)
      .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
      .where(and(eq(stockLocation.id, id), isNull(stockLocation.deleted_at)))
    return { id, deleted: true }
  },

  async updateSalesChannels(id: string, body: { add?: string[]; remove?: string[] }) {
    return updateLocationMetadataIds(id, "sales_channel_ids", ["salesChannelIds"], body)
  },

  async updateFulfillmentProviders(id: string, body: { add?: string[]; remove?: string[] }) {
    return updateLocationMetadataIds(id, "fulfillment_provider_ids", [
      "providerIds",
      "fulfillmentProviderIds",
    ], body)
  },
}

export const shippingOptionService = {
  async list(query: AdminGetShippingOptionsParamsType) {
    const db = getDb()
    const { limit, offset } = listLimitOffset(query, { limit: 50, offset: 0 })
    const rows = sqlRows(
      await db.execute(sql`
        SELECT ${sql.raw(SHIPPING_OPTION_COLS)}
        FROM shipping_option
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `),
    )
    const total = await countShippingOptions()
    const shipping_options = await enrichShippingOptionsBatch(db, rows)
    return { shipping_options, count: total, limit, offset }
  },

  async getById(id: string) {
    const item = await loadShippingOptionById(id)
    if (!item) throw new HTTPException(404, { message: "未找到" })
    return { shipping_option: await enrichShippingOptionRow(item) }
  },

  async create(input: Record<string, unknown>) {
    const db = getDb()
    const service_zone_id = String(input.service_zone_id ?? "")
    if (!service_zone_id) {
      throw new HTTPException(400, { message: "service_zone_id is required" })
    }

    let type_id = (input.type_id as string | undefined) ?? undefined
    if (!type_id) {
      const [defaultType] = await db.select().from(shippingOptionType).limit(1)
      if (!defaultType) {
        throw new HTTPException(400, { message: "No shipping option type configured" })
      }
      type_id = defaultType.id
    }

    const pricesInput = (input.prices as Array<Record<string, unknown>>) ?? []
    const rulesInput = (input.rules as Array<Record<string, unknown>>) ?? []
    const price_type = input.price_type as string | undefined
    const firstAmount = pricesInput.length ? Number(pricesInput[0].amount ?? 0) : undefined

    const metadata = {
      ...((input.metadata as Record<string, unknown> | null | undefined) ?? {}),
      ...(price_type ? { price_type } : {}),
      type_id,
    }
    const data = {
      ...((input.data as Record<string, unknown> | null | undefined) ?? {}),
      ...(firstAmount != null && !Number.isNaN(firstAmount) ? { amount: firstAmount } : {}),
    }

    const id = generateId("so")
    const created = await insertShippingOptionRow({
      id,
      name: String(input.name ?? "Shipping Option"),
      price_type: price_type ?? "flat",
      service_zone_id,
      provider_id: (input.provider_id as string | null | undefined) ?? null,
      shipping_profile_id: (input.shipping_profile_id as string | null | undefined) ?? null,
      shipping_option_type_id: type_id,
      data,
      metadata,
    })
    if (!created) throw new HTTPException(500, { message: "创建配送选项失败" })

    for (const rule of rulesInput) {
      await db.insert(shippingOptionRule).values({
        id: generateId("sorul"),
        attribute: String(rule.attribute),
        operator: String(rule.operator ?? "eq"),
        value: ruleValue(rule.value),
        shipping_option_id: id,
      })
    }

    for (const p of pricesInput) {
      const amount = Number(p.amount ?? 0)
      const priceSetId = generateId("pset")
      await db.insert(priceSet).values({ id: priceSetId })

      try {
        await db.execute(sql`
          INSERT INTO shipping_option_price_set (id, shipping_option_id, price_set_id)
          VALUES (${generateId("sops")}, ${id}, ${priceSetId})
        `)
      } catch {
        await db.execute(sql`
          INSERT INTO shipping_option_price_set (shipping_option_id, price_set_id)
          VALUES (${id}, ${priceSetId})
        `)
      }

      const priceId = generateId("price")
      await db.insert(price).values({
        id: priceId,
        currency_code: String(p.currency_code ?? "usd").toLowerCase(),
        amount: String(amount),
        raw_amount: { amount, precision: 2 },
        price_set_id: priceSetId,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })

      if (p.region_id) {
        await db.insert(priceRule).values({
          id: generateId("prule"),
          attribute: "region_id",
          value: String(p.region_id),
          operator: "eq",
          price_id: priceId,
        })
      }

      for (const r of (p.rules as Array<Record<string, unknown>>) ?? []) {
        await db.insert(priceRule).values({
          id: generateId("prule"),
          attribute: String(r.attribute),
          value: String(r.value ?? ""),
          operator: String(r.operator ?? "eq"),
          price_id: priceId,
        })
      }
    }

    return { shipping_option: await enrichShippingOptionRow(created) }
  },

  async update(id: string, input: Record<string, unknown>) {
    const db = getDb()
    const existing = await loadShippingOptionById(id)
    if (!existing) throw new HTTPException(404, { message: "未找到" })

    const prevMeta = (existing.metadata ?? {}) as Record<string, unknown>
    const nextMeta = { ...prevMeta, ...(input.metadata as Record<string, unknown> | undefined) }
    if (input.type_id) nextMeta.type_id = input.type_id

    const rows = sqlRows(
      await db.execute(sql`
        UPDATE shipping_option
        SET
          name = COALESCE(${input.name != null ? String(input.name) : null}, name),
          price_type = COALESCE(${(input.price_type as string | undefined) ?? null}, price_type),
          provider_id = COALESCE(${(input.provider_id as string | null | undefined) ?? null}, provider_id),
          shipping_profile_id = COALESCE(${(input.shipping_profile_id as string | null | undefined) ?? null}, shipping_profile_id),
          shipping_option_type_id = COALESCE(${(input.type_id as string | undefined) ?? null}, shipping_option_type_id),
          data = COALESCE(${input.data != null ? JSON.stringify(input.data) : null}::jsonb, data),
          metadata = ${JSON.stringify(nextMeta)}::jsonb,
          updated_at = now()
        WHERE id = ${id} AND deleted_at IS NULL
        RETURNING ${sql.raw(SHIPPING_OPTION_COLS)}
      `),
    )
    const updated = rows[0]
    if (!updated) throw new HTTPException(404, { message: "未找到" })
    return { shipping_option: await enrichShippingOptionRow(updated) }
  },

  async delete(id: string) {
    const db = getDb()
    await db.execute(sql`
      UPDATE shipping_option
      SET deleted_at = now(), updated_at = now()
      WHERE id = ${id} AND deleted_at IS NULL
    `)
    return { id, deleted: true }
  },
}
