import { boolean, jsonb, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core"
import { timestamps } from "./timestamps"

/** 对齐 Medusa Translation 模块：按 entity + locale 存字段译文 */
export const translation = pgTable(
  "translation",
  {
    id: text("id").primaryKey(),
    reference: text("reference").notNull(),
    reference_id: text("reference_id").notNull(),
    locale_code: text("locale_code").notNull(),
    translations: jsonb("translations").$type<Record<string, string>>().notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("translation_reference_locale_uidx").on(
      table.reference,
      table.reference_id,
      table.locale_code,
    ),
  ],
)

/** 各 entity 可翻译字段配置（Admin settings 页读写） */
export const translationSetting = pgTable("translation_setting", {
  id: text("id").primaryKey(),
  entity_type: text("entity_type").notNull().unique(),
  fields: jsonb("fields").$type<string[]>().notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  ...timestamps,
})
