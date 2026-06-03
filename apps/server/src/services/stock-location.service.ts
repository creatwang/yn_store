import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm"
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

function sqlRows(result: unknown): Record<string, unknown>[] {
  return (Array.isArray(result) ? result : ((result as { rows?: Record<string, unknown>[] }).rows ?? [])) as Record<string, unknown>[]
}

/** 线上库 shipping_option 列与 Drizzle schema 不一致，统一 raw SQL */
const SHIPPING_OPTION_COLS =
  "id, name, price_type, data, metadata, service_zone_id, provider_id, shipping_profile_id, shipping_option_type_id, created_at, updated_at, deleted_at"

async function loadShippingOptionsForZone(zoneId: string) {
  const db = getDb()
  return sqlRows(
    await db.execute(sql`
      SELECT ${sql.raw(SHIPPING_OPTION_COLS)}
      FROM shipping_option
      WHERE deleted_at IS NULL AND service_zone_id = ${zoneId}
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

async function loadPricesForShippingOption(shippingOptionId: string) {
  const db = getDb()
  const links = sqlRows(
    await db.execute(sql`
      SELECT price_set_id
      FROM shipping_option_price_set
      WHERE shipping_option_id = ${shippingOptionId}
    `),
  )

  const prices = []
  for (const link of links) {
    const priceSetId = String(link.price_set_id)
    const priceRows = await db.select().from(price).where(and(eq(price.price_set_id, priceSetId), isNull(price.deleted_at)))
    for (const row of priceRows) {
      const price_rules = await db.select().from(priceRule).where(eq(priceRule.price_id, row.id))
      prices.push({ ...row, price_rules })
    }
  }
  return prices
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
  const meta = (option.metadata ?? {}) as Record<string, unknown>
  const typeId =
    (option.shipping_option_type_id as string | undefined) ??
    (option.type_id as string | undefined) ??
    (meta.type_id as string | undefined)

  const [zone] = await db
    .select()
    .from(serviceZone)
    .where(eq(serviceZone.id, String(option.service_zone_id)))
    .limit(1)

  if (!zone) return { ...option, service_zone: null }

  const [fs] = await db
    .select()
    .from(fulfillmentSet)
    .where(eq(fulfillmentSet.id, zone.fulfillment_set_id))
    .limit(1)

  let shipping_profile = null
  if (option.shipping_profile_id) {
    const [profile] = await db
      .select()
      .from(shippingProfile)
      .where(eq(shippingProfile.id, String(option.shipping_profile_id)))
      .limit(1)
    shipping_profile = profile ?? null
  }

  let type = null
  if (typeId) {
    const [row] = await db
      .select()
      .from(shippingOptionType)
      .where(eq(shippingOptionType.id, typeId))
      .limit(1)
    type = row ?? { id: typeId, label: "", code: "" }
  }

  const rules = await db
    .select()
    .from(shippingOptionRule)
    .where(eq(shippingOptionRule.shipping_option_id, String(option.id)))

  const prices = await loadPricesForShippingOption(String(option.id))
  const price_type =
    (option.price_type as string | undefined) ?? (meta.price_type as string | undefined) ?? "flat"

  return {
    ...option,
    type_id: typeId,
    type,
    price_type,
    rules,
    prices,
    shipping_profile,
    service_zone: {
      ...zone,
      fulfillment_set: fs ?? null,
    },
  }
}

async function loadServiceZonesForSet(fulfillmentSetId: string, full: boolean) {
  const db = getDb()
  const zones = await db
    .select()
    .from(serviceZone)
    .where(eq(serviceZone.fulfillment_set_id, fulfillmentSetId))

  return Promise.all(
    zones.map(async (zone) => {
      const geo_zones = await db.select().from(geoZone).where(eq(geoZone.service_zone_id, zone.id))
      if (!full) {
        return { ...zone, geo_zones, shipping_options: [] }
      }
      const options = await loadShippingOptionsForZone(zone.id)
      const shipping_options = await Promise.all(options.map((o) => enrichShippingOptionRow(o)))
      return { ...zone, geo_zones, shipping_options }
    }),
  )
}

async function loadFulfillmentSetsForLocation(locationId: string, full: boolean) {
  const db = getDb()
  const sets = await db
    .select()
    .from(fulfillmentSet)
    .where(sql`${fulfillmentSet.metadata}->>'location_id' = ${locationId}`)

  return Promise.all(
    sets.map(async (fs) => ({
      ...fs,
      service_zones: await loadServiceZonesForSet(fs.id, full),
    })),
  )
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
  const [fulfillment_sets, sales_channels] = await Promise.all([
    loadFulfillmentSetsForLocation(loc.id, full),
    loadSalesChannels(loc.metadata),
  ])
  const fulfillment_providers = await loadFulfillmentProviders(loc.metadata)
  return {
    ...loc,
    fulfillment_sets,
    sales_channels,
    fulfillment_providers,
  }
}

export const stockLocationService = {
  async list(query: { limit: number; offset: number }) {
    const db = getDb()
    const where = isNull(stockLocation.deleted_at)
    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(stockLocation)
        .where(where)
        .orderBy(desc(stockLocation.created_at))
        .limit(query.limit)
        .offset(query.offset),
      db.select({ total: count() }).from(stockLocation).where(where),
    ])
    // 对齐官方 list：不展开 fulfillment_sets（详情页再 enrich）
    return {
      stock_locations: rows,
      count: Number(total),
      limit: query.limit,
      offset: query.offset,
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
  async list(query: { limit: number; offset: number }) {
    const db = getDb()
    const rows = sqlRows(
      await db.execute(sql`
        SELECT ${sql.raw(SHIPPING_OPTION_COLS)}
        FROM shipping_option
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT ${query.limit} OFFSET ${query.offset}
      `),
    )
    const total = await countShippingOptions()
    const shipping_options = await Promise.all(rows.map((o) => enrichShippingOptionRow(o)))
    return { shipping_options, count: total, limit: query.limit, offset: query.offset }
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
