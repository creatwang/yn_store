import { and, eq, inArray, isNull, sql } from "drizzle-orm"
import { getDb, store, storeCurrency, storeLocale, generateId } from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import { toAdminLocale } from "../lib/translation"

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
        default_locale_code: store.default_locale_code,
        metadata: store.metadata,
        created_at: store.created_at,
        updated_at: store.updated_at,
      })
      .from(store)
      .where(isNull(store.deleted_at))
      .limit(1)

    const count = rows.length
    const storeIds = rows.map((r) => r.id)
    const currencies =
      storeIds.length > 0
        ? await db
            .select()
            .from(storeCurrency)
            .where(inArray(storeCurrency.store_id, storeIds))
        : []
    const locales =
      storeIds.length > 0
        ? await db
            .select()
            .from(storeLocale)
            .where(inArray(storeLocale.store_id, storeIds))
        : []
    const currenciesByStore = new Map<string, typeof currencies>()
    for (const c of currencies) {
      const list = currenciesByStore.get(c.store_id) ?? []
      list.push(c)
      currenciesByStore.set(c.store_id, list)
    }
    const localesByStore = new Map<string, typeof locales>()
    for (const l of locales) {
      const list = localesByStore.get(l.store_id) ?? []
      list.push(l)
      localesByStore.set(l.store_id, list)
    }

    return {
      stores: rows.map((row) => ({
        ...row,
        supported_currencies: currenciesByStore.get(row.id) ?? [],
        supported_locales: (localesByStore.get(row.id) ?? []).map((l) => ({
          locale_code: l.locale_code,
          locale: toAdminLocale(l.locale_code),
        })),
      })),
      count,
      offset: 0,
      limit: 1,
    }
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

    const localeRows = await db
      .select()
      .from(storeLocale)
      .where(eq(storeLocale.store_id, id))

    return {
      store: {
        ...row,
        supported_currencies: currencies,
        supported_locales: localeRows.map((l) => ({
          locale_code: l.locale_code,
          locale: toAdminLocale(l.locale_code),
        })),
      },
    }
  },

  // 参考: @medusajs/medusa/dist/api/admin/stores/[id]/route.js (POST)
  async updateStore(id: string, input: {
    name?: string
    supported_currencies?: { currency_code: string; is_default?: boolean }[]
    supported_locales?: { locale_code: string }[]
    default_sales_channel_id?: string | null
    default_region_id?: string | null
    default_location_id?: string | null
    default_locale_code?: string | null
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

    const currentLocales = await db
      .select({ locale_code: storeLocale.locale_code })
      .from(storeLocale)
      .where(eq(storeLocale.store_id, id))
    const supportedLocaleCodes =
      input.supported_locales !== undefined
        ? input.supported_locales.map((l) => l.locale_code)
        : currentLocales.map((l) => l.locale_code)

    if (
      input.default_locale_code !== undefined &&
      input.default_locale_code !== null &&
      !supportedLocaleCodes.includes(input.default_locale_code)
    ) {
      throw new HTTPException(400, {
        message: "Default locale must be one of the store supported locales",
      })
    }

    let nextDefaultLocaleCode: string | null | undefined = undefined
    if (input.default_locale_code !== undefined) {
      nextDefaultLocaleCode = input.default_locale_code
    } else if (input.supported_locales !== undefined) {
      const [currentStore] = await db
        .select({ default_locale_code: store.default_locale_code })
        .from(store)
        .where(eq(store.id, id))
        .limit(1)
      if (
        currentStore?.default_locale_code &&
        !supportedLocaleCodes.includes(currentStore.default_locale_code)
      ) {
        nextDefaultLocaleCode = null
      }
    }

    const [updated] = await db
      .update(store)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.default_sales_channel_id !== undefined && { default_sales_channel_id: input.default_sales_channel_id }),
        ...(input.default_region_id !== undefined && { default_region_id: input.default_region_id }),
        ...(input.default_location_id !== undefined && { default_location_id: input.default_location_id }),
        ...(nextDefaultLocaleCode !== undefined && {
          default_locale_code: nextDefaultLocaleCode,
        }),
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

    if (input.supported_locales !== undefined) {
      await db.delete(storeLocale).where(eq(storeLocale.store_id, id))
      if (input.supported_locales.length) {
        await db.insert(storeLocale).values(
          input.supported_locales.map((l) => ({
            id: generateId("stloc"),
            locale_code: l.locale_code,
            store_id: id,
          }))
        )
      }
    }

    const currencies = await db
      .select()
      .from(storeCurrency)
      .where(eq(storeCurrency.store_id, id))

    const localeRows = await db
      .select()
      .from(storeLocale)
      .where(eq(storeLocale.store_id, id))

    return {
      store: {
        ...updated,
        supported_currencies: currencies,
        supported_locales: localeRows.map((l) => ({
          locale_code: l.locale_code,
          locale: toAdminLocale(l.locale_code),
        })),
      },
    }
  },

  async listCurrencies(storeId: string) {
    const db = getDb()
    const currencies = await db.select().from(storeCurrency).where(eq(storeCurrency.store_id, storeId))
    return { currencies, count: currencies.length }
  },

  /** Store API：店铺语言配置（含 C 端默认语言，与 Admin「商店 → 语言」一致） */
  async listStoreLocalesForStorefront() {
    const db = getDb()
    const [row] = await db
      .select({
        id: store.id,
        default_locale_code: store.default_locale_code,
      })
      .from(store)
      .where(isNull(store.deleted_at))
      .limit(1)
    if (!row) {
      return { locales: [], default_locale_code: null as string | null, count: 0 }
    }
    const localeRows = await db
      .select({ locale_code: storeLocale.locale_code })
      .from(storeLocale)
      .where(eq(storeLocale.store_id, row.id))
    const locales = localeRows.map((l) => toAdminLocale(l.locale_code))
    return {
      locales,
      default_locale_code: row.default_locale_code,
      count: locales.length,
    }
  },

  async listStoreCurrencies() {
    const db = getDb()
    const [row] = await db
      .select({ id: store.id })
      .from(store)
      .where(isNull(store.deleted_at))
      .limit(1)
    if (!row) {
      return { currencies: [], count: 0 }
    }
    const currencies = await db
      .select()
      .from(storeCurrency)
      .where(eq(storeCurrency.store_id, row.id))
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
