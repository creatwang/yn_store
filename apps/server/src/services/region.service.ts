import { and, count, desc, eq, isNull, sql } from "drizzle-orm"
import { generateId, getDb, region, salesChannel } from "@my-store/db"
import type {
  CreateRegionInput,
  ListRegionsQuery,
  UpdateRegionInput,
  CreateSalesChannelInput,
  ListSalesChannelsQuery,
  UpdateSalesChannelInput,
} from "@my-store/validators"
import { HTTPException } from "hono/http-exception"

export const regionService = {
  async listRegions(query: ListRegionsQuery) {
    const db = getDb()
    const conditions = [isNull(region.deleted_at)]

    const where = and(...conditions)

    const [regions, [{ total }]] = await Promise.all([
      db
        .select()
        .from(region)
        .where(where)
        .orderBy(desc(region.created_at))
        .limit(query.limit)
        .offset(query.offset),
      db.select({ total: count() }).from(region).where(where),
    ])

    return {
      regions,
      count: Number(total),
      limit: query.limit,
      offset: query.offset,
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

    return { region: item }
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
        metadata: input.metadata ?? null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning()

    return { region: created }
  },

  async updateRegion(id: string, input: UpdateRegionInput) {
    const db = getDb()
    await this.getRegionById(id)

    const [updated] = await db
      .update(region)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.currency_code !== undefined && { currency_code: input.currency_code }),
        ...(input.metadata !== undefined && { metadata: input.metadata }),
        updated_at: sql`now()`,
      })
      .where(and(eq(region.id, id), isNull(region.deleted_at)))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: "Region not found" })
    }

    return { region: updated }
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

  async listSalesChannels(query: ListSalesChannelsQuery) {
    const db = getDb()
    const conditions = [isNull(salesChannel.deleted_at)]

    const where = and(...conditions)

    const [channels, [{ total }]] = await Promise.all([
      db
        .select()
        .from(salesChannel)
        .where(where)
        .orderBy(desc(salesChannel.created_at))
        .limit(query.limit)
        .offset(query.offset),
      db.select({ total: count() }).from(salesChannel).where(where),
    ])

    return {
      sales_channels: channels,
      count: Number(total),
      limit: query.limit,
      offset: query.offset,
    }
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
}
