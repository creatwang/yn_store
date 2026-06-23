import { and, count, desc, eq, inArray, isNull } from "drizzle-orm"
import {
  generateId,
  getDb,
  product,
  productCategory,
  productCollection,
  productTag,
  productType,
  productVariant,
  store,
  storeLocale,
  translation,
  translationSetting,
} from "@my-store/db"
import type {
  AdminBatchTranslationsType,
  AdminBatchTranslationSettingsType,
  AdminGetTranslationsParamsType,
  AdminTranslationEntitiesParamsType,
  AdminTranslationSettingsParamsType,
  AdminTranslationStatisticsParamsType,
} from "@my-store/validators/medusa/admin/translations/validators"
import { HTTPException } from "hono/http-exception"
import {
  LOCALE_CATALOG,
  toAdminLocale,
  ENTITY_FIELD_CATALOG,
  getInactiveFields,
  TRANSLATABLE_ENTITY_TYPES,
} from "../lib/translation"
import { listLimitOffset } from "../lib/infra/query/query-filters"

const DEFAULT_SETTINGS = TRANSLATABLE_ENTITY_TYPES.map((entity_type) => ({
  entity_type,
  fields: ENTITY_FIELD_CATALOG[entity_type] ?? [],
  is_active: true,
}))

async function ensureDefaultSettings() {
  const db = getDb()
  const existing = await db.select({ id: translationSetting.id }).from(translationSetting).limit(1)
  if (existing.length) {
    return
  }
  await db.insert(translationSetting).values(
    DEFAULT_SETTINGS.map((s) => ({
      id: generateId("trset"),
      entity_type: s.entity_type,
      fields: s.fields,
      is_active: s.is_active,
    })),
  )
}

function mapTranslationRow(row: typeof translation.$inferSelect) {
  return {
    id: row.id,
    reference_id: row.reference_id,
    reference: row.reference,
    locale_code: row.locale_code,
    translations: row.translations ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function mapSettingRow(row: typeof translationSetting.$inferSelect) {
  const fields = row.fields ?? []
  return {
    id: row.id,
    entity_type: row.entity_type,
    fields,
    inactive_fields: getInactiveFields(row.entity_type, fields),
    is_active: row.is_active,
  }
}

async function getStoreLocaleCodes(): Promise<string[]> {
  const db = getDb()
  const [storeRow] = await db.select({ id: store.id }).from(store).limit(1)
  if (!storeRow) {
    return []
  }
  const rows = await db
    .select({ locale_code: storeLocale.locale_code })
    .from(storeLocale)
    .where(eq(storeLocale.store_id, storeRow.id))
  return rows.map((r) => r.locale_code)
}

function entityTable(entityType: string) {
  switch (entityType) {
    case "product":
      return product
    case "product_variant":
      return productVariant
    case "product_collection":
      return productCollection
    case "product_category":
      return productCategory
    case "product_tag":
      return productTag
    case "product_type":
      return productType
    default:
      return null
  }
}

async function countEntities(entityType: string): Promise<number> {
  const table = entityTable(entityType)
  if (!table) {
    return 0
  }
  const db = getDb()
  const [{ total }] = await db
    .select({ total: count() })
    .from(table)
    .where(isNull(table.deleted_at))
  return Number(total)
}

function countTranslatedFields(
  translations: Record<string, string> | undefined,
  fields: string[],
): number {
  if (!translations) {
    return 0
  }
  return fields.filter((f) => (translations[f] ?? "").trim().length > 0).length
}

export const translationService = {
  async list(query: AdminGetTranslationsParamsType) {
    const db = getDb()
    const { limit, offset } = listLimitOffset(query, { limit: 20, offset: 0 })
    const conditions = [isNull(translation.deleted_at)]

    if (query.reference) {
      conditions.push(eq(translation.reference, query.reference))
    }
    if (query.locale_code) {
      conditions.push(eq(translation.locale_code, query.locale_code))
    }
    if (query.reference_id) {
      const ids = Array.isArray(query.reference_id) ? query.reference_id : [query.reference_id]
      conditions.push(inArray(translation.reference_id, ids))
    }

    const where = and(...conditions)
    const [rows, [{ total }]] = await Promise.all([
      db.select().from(translation).where(where).limit(limit).offset(offset),
      db.select({ total: count() }).from(translation).where(where),
    ])

    return {
      translations: rows.map(mapTranslationRow),
      count: Number(total),
      limit,
      offset,
    }
  },

  async batch(body: AdminBatchTranslationsType) {
    const db = getDb()
    const created: ReturnType<typeof mapTranslationRow>[] = []
    const updated: ReturnType<typeof mapTranslationRow>[] = []
    const deleted: string[] = []

    for (const item of body.create ?? []) {
      const id = generateId("transl")
      const [row] = await db
        .insert(translation)
        .values({
          id,
          reference: item.reference,
          reference_id: item.reference_id,
          locale_code: item.locale_code,
          translations: item.translations,
        })
        .returning()
      created.push(mapTranslationRow(row))
    }

    for (const item of body.update ?? []) {
      const patch: Partial<typeof translation.$inferInsert> = {
        updated_at: new Date(),
      }
      if (item.translations !== undefined) {
        patch.translations = item.translations
      }
      if (item.reference !== undefined) {
        patch.reference = item.reference
      }
      if (item.reference_id !== undefined) {
        patch.reference_id = item.reference_id
      }
      if (item.locale_code !== undefined) {
        patch.locale_code = item.locale_code
      }

      const [row] = await db
        .update(translation)
        .set(patch)
        .where(and(eq(translation.id, item.id), isNull(translation.deleted_at)))
        .returning()
      if (row) {
        updated.push(mapTranslationRow(row))
      }
    }

    for (const id of body.delete ?? []) {
      await db
        .update(translation)
        .set({ deleted_at: new Date() })
        .where(eq(translation.id, id))
      deleted.push(id)
    }

    return { created, updated, deleted }
  },

  async entities(query: AdminTranslationEntitiesParamsType) {
    await ensureDefaultSettings()
    const db = getDb()
    const entityType = query.type
    const { limit, offset } = listLimitOffset(query, { limit: 20, offset: 0 })
    const ids = query.id
      ? Array.isArray(query.id)
        ? query.id
        : [query.id]
      : undefined

    const table = entityTable(entityType)
    if (!table) {
      throw new HTTPException(400, { message: `Unsupported entity type: ${entityType}` })
    }

    const conditions = [isNull(table.deleted_at)]
    if (ids?.length) {
      conditions.push(inArray(table.id, ids))
    }
    const where = and(...conditions)

    const [entityRows, [{ total }]] = await Promise.all([
      db.select().from(table).where(where).orderBy(desc(table.created_at)).limit(limit).offset(offset),
      db.select({ total: count() }).from(table).where(where),
    ])

    const entityIds = entityRows.map((r) => r.id)
    const translationRows =
      entityIds.length > 0
        ? await db
            .select()
            .from(translation)
            .where(
              and(
                eq(translation.reference, entityType),
                inArray(translation.reference_id, entityIds),
                isNull(translation.deleted_at),
              ),
            )
        : []

    const translationsByEntity = new Map<string, ReturnType<typeof mapTranslationRow>[]>()
    for (const row of translationRows) {
      const list = translationsByEntity.get(row.reference_id) ?? []
      list.push(mapTranslationRow(row))
      translationsByEntity.set(row.reference_id, list)
    }

    const data = entityRows.map((entity) => ({
      ...entity,
      translations: translationsByEntity.get(entity.id) ?? [],
    }))

    return { data, count: Number(total), limit, offset }
  },

  async settings(query: AdminTranslationSettingsParamsType) {
    await ensureDefaultSettings()
    const db = getDb()
    const rows = await db.select().from(translationSetting)
    const filtered = rows.filter((row) => {
      if (query.entity_type && row.entity_type !== query.entity_type) {
        return false
      }
      if (query.is_active !== undefined && row.is_active !== query.is_active) {
        return false
      }
      return true
    })

    const translation_settings: Record<string, ReturnType<typeof mapSettingRow>> = {}
    for (const row of filtered) {
      translation_settings[row.entity_type] = mapSettingRow(row)
    }

    return { translation_settings }
  },

  async batchSettings(body: AdminBatchTranslationSettingsType) {
    const db = getDb()
    const created: ReturnType<typeof mapSettingRow>[] = []
    const updated: ReturnType<typeof mapSettingRow>[] = []

    for (const item of body.create ?? []) {
      const id = generateId("trset")
      const [row] = await db
        .insert(translationSetting)
        .values({
          id,
          entity_type: item.entity_type,
          fields: item.fields,
          is_active: item.is_active ?? true,
        })
        .returning()
      created.push(mapSettingRow(row))
    }

    for (const item of body.update ?? []) {
      const patch: Partial<typeof translationSetting.$inferInsert> = {
        updated_at: new Date(),
      }
      if (item.fields !== undefined) {
        patch.fields = item.fields
      }
      if (item.entity_type !== undefined) {
        patch.entity_type = item.entity_type
      }
      if (item.is_active !== undefined) {
        patch.is_active = item.is_active
      }

      const [row] = await db
        .update(translationSetting)
        .set(patch)
        .where(eq(translationSetting.id, item.id))
        .returning()
      if (row) {
        updated.push(mapSettingRow(row))
      }
    }

    return { created, updated }
  },

  async statistics(query: AdminTranslationStatisticsParamsType) {
    await ensureDefaultSettings()
    const db = getDb()
    const settingsRows = await db
      .select()
      .from(translationSetting)
      .where(
        inArray(
          translationSetting.entity_type,
          query.entity_types.length ? query.entity_types : TRANSLATABLE_ENTITY_TYPES,
        ),
      )

    const statistics: Record<
      string,
      {
        translated: number
        expected: number
        by_locale: Record<string, { translated: number; expected: number }>
      }
    > = {}

    for (const setting of settingsRows) {
      if (!setting.is_active || !setting.fields.length) {
        statistics[setting.entity_type] = {
          translated: 0,
          expected: 0,
          by_locale: {},
        }
        continue
      }

      const entityCount = await countEntities(setting.entity_type)
      const by_locale: Record<string, { translated: number; expected: number }> = {}
      let translatedTotal = 0
      let expectedTotal = 0

      for (const localeCode of query.locales) {
        const expected = entityCount * setting.fields.length
        const rows = await db
          .select({ translations: translation.translations })
          .from(translation)
          .where(
            and(
              eq(translation.reference, setting.entity_type),
              eq(translation.locale_code, localeCode),
              isNull(translation.deleted_at),
            ),
          )

        let translated = 0
        for (const row of rows) {
          translated += countTranslatedFields(row.translations ?? {}, setting.fields)
        }

        by_locale[localeCode] = { translated, expected }
        translatedTotal += translated
        expectedTotal += expected
      }

      statistics[setting.entity_type] = {
        translated: translatedTotal,
        expected: expectedTotal,
        by_locale,
      }
    }

    return { statistics }
  },

  listCatalogLocales(codes?: string[]) {
    const list = (codes?.length ? codes : LOCALE_CATALOG).map(toAdminLocale)
    return { locales: list, count: list.length }
  },

  async listStoreLocales() {
    const codes = await getStoreLocaleCodes()
    const locales = codes.map(toAdminLocale)
    return { locales, count: locales.length }
  },
}
