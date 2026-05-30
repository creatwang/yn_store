import { and, eq, isNull, sql } from "drizzle-orm"
import { getDb, store, storeCurrency, generateId } from "@my-store/db"
import { HTTPException } from "hono/http-exception"

export const storeService = {
  // 参考: @medusajs/medusa/dist/api/admin/stores/route.js (GET)
  async listStores() {
    const db = getDb()
    const rows = await db
      .select({
        id: store.id,
        name: store.name,
        default_sales_channel_id: store.default_sales_channel_id,
        default_region_id: store.default_region_id,
        default_location_id: store.default_location_id,
        metadata: store.metadata,
        created_at: store.created_at,
        updated_at: store.updated_at,
      })
      .from(store)
      .where(isNull(store.deleted_at))
      .limit(1)

    const count = rows.length

    return { stores: rows, count, offset: 0, limit: 1 }
  },

  // 参考: @medusajs/medusa/dist/api/admin/stores/[id]/route.js (GET)
  async getStoreById(id: string) {
    const db = getDb()
    const [row] = await db
      .select()
      .from(store)
      .where(eq(store.id, id))
      .limit(1)

    if (!row) {
      throw new HTTPException(404, { message: `Store with id "${id}" not found` })
    }

    // 加载 supported_currencies（对齐 defaultAdminStoreFields）
    const currencies = await db
      .select()
      .from(storeCurrency)
      .where(eq(storeCurrency.store_id, id))

    return { store: { ...row, supported_currencies: currencies } }
  },

  // 参考: @medusajs/medusa/dist/api/admin/stores/[id]/route.js (POST)
  async updateStore(id: string, input: {
    name?: string
    supported_currencies?: { currency_code: string; is_default?: boolean }[]
    default_sales_channel_id?: string | null
    default_region_id?: string | null
    default_location_id?: string | null
    metadata?: Record<string, unknown> | null
  }) {
    const db = getDb()

    const [existing] = await db
      .select({ id: store.id })
      .from(store)
      .where(eq(store.id, id))
      .limit(1)

    if (!existing) {
      throw new HTTPException(404, { message: `Store with id "${id}" not found` })
    }

    const [updated] = await db
      .update(store)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.default_sales_channel_id !== undefined && { default_sales_channel_id: input.default_sales_channel_id }),
        ...(input.default_region_id !== undefined && { default_region_id: input.default_region_id }),
        ...(input.default_location_id !== undefined && { default_location_id: input.default_location_id }),
        ...(input.metadata !== undefined && { metadata: input.metadata }),
        updated_at: sql`now()`,
      })
      .where(eq(store.id, id))
      .returning()

    // 全量替换 supported_currencies
    if (input.supported_currencies !== undefined) {
      await db.delete(storeCurrency).where(eq(storeCurrency.store_id, id))
      if (input.supported_currencies.length) {
        await db.insert(storeCurrency).values(
          input.supported_currencies.map((c) => ({
            id: generateId("scur"),
            currency_code: c.currency_code,
            is_default: c.is_default ?? false,
            store_id: id,
          }))
        )
      }
    }

    const currencies = await db
      .select()
      .from(storeCurrency)
      .where(eq(storeCurrency.store_id, id))

    return { store: { ...updated, supported_currencies: currencies } }
  },

  async listCurrencies(storeId: string) {
    const db = getDb()
    const currencies = await db.select().from(storeCurrency).where(eq(storeCurrency.store_id, storeId))
    return { currencies, count: currencies.length }
  },

  async addCurrencies(storeId: string, input: { currency_code: string }[]) {
    const db = getDb()
    const values = input.map((c) => ({
      id: generateId("scur"),
      currency_code: c.currency_code,
      store_id: storeId,
    }))
    if (values.length) await db.insert(storeCurrency).values(values)
    return this.listCurrencies(storeId)
  },

  async removeCurrencies(storeId: string, input: { currency_code: string }[]) {
    const db = getDb()
    for (const c of input) {
      await db.delete(storeCurrency).where(and(eq(storeCurrency.store_id, storeId), eq(storeCurrency.currency_code, c.currency_code)))
    }
    return this.listCurrencies(storeId)
  },
}
