import { and, count, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  paymentProvider,
  region,
  regionPaymentProvider,
  salesChannel,
  store,
} from "@my-store/db"
import type {
  CreateRegionInput,
  UpdateRegionInput,
  CreateSalesChannelInput,
  UpdateSalesChannelInput,
} from "@my-store/validators"
import type {
  AdminGetRegionsParamsType,
  AdminGetSalesChannelsParamsType,
  StoreGetRegionsParamsType,
} from "@my-store/validators/admin-list-params"
import { listLimitOffset } from "../lib/infra/query/query-filters"
import {
  loadCountriesByRegionIds,
  syncRegionCountries,
  type RegionCountryDto,
} from "../lib/region/region-country-sync"
import { HTTPException } from "hono/http-exception"

type RegionPaymentProviderDto = { id: string; is_enabled: boolean }

async function loadPaymentProvidersByRegionIds(
  regionIds: string[],
): Promise<Map<string, RegionPaymentProviderDto[]>> {
  const map = new Map<string, RegionPaymentProviderDto[]>()
  if (!regionIds.length) return map

  const db = getDb()
  const links = await db
    .select()
    .from(regionPaymentProvider)
    .where(inArray(regionPaymentProvider.region_id, regionIds))

  const providerIds = [...new Set(links.map((l) => l.payment_provider_id))]
  const providers =
    providerIds.length > 0
      ? await db
          .select()
          .from(paymentProvider)
          .where(inArray(paymentProvider.id, providerIds))
      : []
  const providerById = new Map(providers.map((p) => [p.id, p]))

  for (const link of links) {
    const p = providerById.get(link.payment_provider_id)
    if (!p) continue
    const list = map.get(link.region_id) ?? []
    list.push({ id: p.id, is_enabled: p.is_enabled })
    map.set(link.region_id, list)
  }
  return map
}

async function replaceRegionPaymentProviders(
  regionId: string,
  providerIds: string[],
) {
  const db = getDb()
  await db
    .delete(regionPaymentProvider)
    .where(eq(regionPaymentProvider.region_id, regionId))
  if (!providerIds.length) return
  await db.insert(regionPaymentProvider).values(
    providerIds.map((payment_provider_id) => ({
      id: generateId("regpp"),
      region_id: regionId,
      payment_provider_id,
    })),
  )
}

function attachPaymentProviders<T extends { id: string }>(
  rows: T[],
  byRegion: Map<string, RegionPaymentProviderDto[]>,
) {
  return rows.map((row) => ({
    ...row,
    payment_providers: byRegion.get(row.id) ?? [],
  }))
}

function attachCountries<T extends { id: string }>(
  rows: T[],
  byRegion: Map<string, RegionCountryDto[]>,
) {
  return rows.map((row) => ({
    ...row,
    countries: byRegion.get(row.id) ?? [],
  }))
}

function enrichRegions<T extends { id: string }>(
  rows: T[],
  countriesByRegion: Awaited<ReturnType<typeof loadCountriesByRegionIds>>,
  providersByRegion: Map<string, RegionPaymentProviderDto[]>,
) {
  return attachPaymentProviders(
    attachCountries(rows, countriesByRegion),
    providersByRegion,
  )
}

export const regionService = {
  async listRegions(
    query: AdminGetRegionsParamsType | StoreGetRegionsParamsType,
  ) {
    const db = getDb()
    const { limit, offset } = listLimitOffset(query, { limit: 50, offset: 0 })
    const conditions = [isNull(region.deleted_at)]

    const idFilter = query.id
    if (idFilter !== undefined) {
      const ids = Array.isArray(idFilter) ? idFilter : [idFilter]
      if (ids.length) conditions.push(inArray(region.id, ids))
    }

    if (typeof query.q === "string" && query.q.trim()) {
      conditions.push(ilike(region.name, `%${query.q.trim()}%`))
    }

    const where = and(...conditions)

    const [regions, [{ total }]] = await Promise.all([
      db
        .select()
        .from(region)
        .where(where)
        .orderBy(desc(region.created_at))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(region).where(where),
    ])

    const regionIds = regions.map((r) => r.id)
    const [providersByRegion, countriesByRegion] = await Promise.all([
      loadPaymentProvidersByRegionIds(regionIds),
      loadCountriesByRegionIds(regionIds),
    ])

    return {
      regions: enrichRegions(regions, countriesByRegion, providersByRegion),
      count: Number(total),
      limit,
      offset,
    }
  },

  async getRegionById(id: string) {
    const db = getDb()
    const [item] = await db
      .select()
      .from(region)
      .where(and(eq(region.id, id), isNull(region.deleted_at)))
      .limit(1)

    if (!item) {
      throw new HTTPException(404, { message: "Region not found" })
    }

    const [providersByRegion, countriesByRegion] = await Promise.all([
      loadPaymentProvidersByRegionIds([id]),
      loadCountriesByRegionIds([id]),
    ])
    return {
      region: {
        ...item,
        payment_providers: providersByRegion.get(id) ?? [],
        countries: countriesByRegion.get(id) ?? [],
      },
    }
  },

  async createRegion(input: CreateRegionInput) {
    const db = getDb()
    const id = generateId("reg")

    const [created] = await db
      .insert(region)
      .values({
        id,
        name: input.name,
        currency_code: input.currency_code,
        automatic_taxes: input.automatic_taxes ?? true,
        metadata: input.metadata ?? null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning()

    if (input.payment_providers?.length) {
      await replaceRegionPaymentProviders(id, input.payment_providers)
    }
    if (input.countries?.length) {
      await syncRegionCountries(id, input.countries)
    }

    const [providersByRegion, countriesByRegion] = await Promise.all([
      loadPaymentProvidersByRegionIds([id]),
      loadCountriesByRegionIds([id]),
    ])
    return {
      region: {
        ...created,
        payment_providers: providersByRegion.get(id) ?? [],
        countries: countriesByRegion.get(id) ?? [],
      },
    }
  },

  async updateRegion(id: string, input: UpdateRegionInput) {
    const db = getDb()
    await this.getRegionById(id)

    const [updated] = await db
      .update(region)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.currency_code !== undefined && { currency_code: input.currency_code }),
        ...(input.automatic_taxes !== undefined && { automatic_taxes: input.automatic_taxes }),
        ...(input.metadata !== undefined && { metadata: input.metadata }),
        updated_at: sql`now()`,
      })
      .where(and(eq(region.id, id), isNull(region.deleted_at)))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: "Region not found" })
    }

    if (input.payment_providers !== undefined) {
      await replaceRegionPaymentProviders(id, input.payment_providers)
    }
    if (input.countries !== undefined) {
      await syncRegionCountries(id, input.countries)
    }

    const [providersByRegion, countriesByRegion] = await Promise.all([
      loadPaymentProvidersByRegionIds([id]),
      loadCountriesByRegionIds([id]),
    ])
    return {
      region: {
        ...updated,
        payment_providers: providersByRegion.get(id) ?? [],
        countries: countriesByRegion.get(id) ?? [],
      },
    }
  },

  async deleteRegion(id: string) {
    const db = getDb()
    await this.getRegionById(id)

    await db
      .update(region)
      .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
      .where(and(eq(region.id, id), isNull(region.deleted_at)))

    return { success: true }
  },

  async batchDeleteRegions(ids: string[]) {
    const db = getDb()
    if (!ids.length) {
      return { deleted: [] as string[], not_found: [] as string[] }
    }
    const existing = await db
      .select({ id: region.id })
      .from(region)
      .where(and(inArray(region.id, ids), isNull(region.deleted_at)))
    const existingIds = existing.map((r) => r.id)
    const existingSet = new Set(existingIds)
    const notFound = ids.filter((id) => !existingSet.has(id))
    if (existingIds.length) {
      await db
        .update(region)
        .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
        .where(and(inArray(region.id, existingIds), isNull(region.deleted_at)))
    }
    return { deleted: existingIds, not_found: notFound }
  },

  async listSalesChannels(query: AdminGetSalesChannelsParamsType) {
    const db = getDb()
    const { limit, offset } = listLimitOffset(query, { limit: 50, offset: 0 })
    const conditions = [isNull(salesChannel.deleted_at)]

    if (typeof query.q === "string" && query.q.trim()) {
      const term = `%${query.q.trim()}%`
      conditions.push(
        or(
          ilike(salesChannel.name, term),
          ilike(salesChannel.description, term),
        )!,
      )
    }

    const where = and(...conditions)

    const [channels, [{ total }]] = await Promise.all([
      db
        .select()
        .from(salesChannel)
        .where(where)
        .orderBy(desc(salesChannel.created_at))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(salesChannel).where(where),
    ])

    return {
      sales_channels: channels,
      count: Number(total),
      limit,
      offset,
    }
  },

  async getDefaultSalesChannel() {
    const db = getDb()
    const [storeRow] = await db
      .select({ id: store.default_sales_channel_id })
      .from(store)
      .where(isNull(store.deleted_at))
      .limit(1)

    if (!storeRow?.id) {
      throw new HTTPException(404, { message: "No default sales channel configured" })
    }

    return this.getSalesChannelById(storeRow.id)
  },

  async getSalesChannelById(id: string) {
    const db = getDb()
    const [item] = await db
      .select()
      .from(salesChannel)
      .where(and(eq(salesChannel.id, id), isNull(salesChannel.deleted_at)))
      .limit(1)

    if (!item) {
      throw new HTTPException(404, { message: "Sales Channel not found" })
    }

    return { sales_channel: item }
  },

  async createSalesChannel(input: CreateSalesChannelInput) {
    const db = getDb()
    const id = generateId("sc")

    const [created] = await db
      .insert(salesChannel)
      .values({
        id,
        name: input.name,
        description: input.description ?? null,
        is_disabled: input.is_disabled ?? false,
        metadata: input.metadata ?? null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning()

    return { sales_channel: created }
  },

  async updateSalesChannel(id: string, input: UpdateSalesChannelInput) {
    const db = getDb()
    await this.getSalesChannelById(id)

    const [updated] = await db
      .update(salesChannel)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.is_disabled !== undefined && { is_disabled: input.is_disabled }),
        ...(input.metadata !== undefined && { metadata: input.metadata }),
        updated_at: sql`now()`,
      })
      .where(and(eq(salesChannel.id, id), isNull(salesChannel.deleted_at)))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: "Sales Channel not found" })
    }

    return { sales_channel: updated }
  },

  async deleteSalesChannel(id: string) {
    const db = getDb()
    await this.getSalesChannelById(id)

    await db
      .update(salesChannel)
      .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
      .where(and(eq(salesChannel.id, id), isNull(salesChannel.deleted_at)))

    return { success: true }
  },

  async batchDeleteSalesChannels(ids: string[]) {
    const db = getDb()
    if (!ids.length) {
      return { deleted: [] as string[], not_found: [] as string[] }
    }
    const existing = await db
      .select({ id: salesChannel.id })
      .from(salesChannel)
      .where(and(inArray(salesChannel.id, ids), isNull(salesChannel.deleted_at)))
    const existingIds = existing.map((r) => r.id)
    const existingSet = new Set(existingIds)
    const notFound = ids.filter((id) => !existingSet.has(id))
    if (existingIds.length) {
      await db
        .update(salesChannel)
        .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
        .where(and(inArray(salesChannel.id, existingIds), isNull(salesChannel.deleted_at)))
    }
    return { deleted: existingIds, not_found: notFound }
  },
}
