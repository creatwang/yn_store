import { sql } from "drizzle-orm"
import { getDb } from "@my-store/db"

/** 补齐 translation 模块表（Medusa 官方 migration 未跑时） */
export async function ensureTranslationSchema() {
  const db = getDb()
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS translation (
      id text PRIMARY KEY NOT NULL,
      reference text NOT NULL,
      reference_id text NOT NULL,
      locale_code text NOT NULL,
      translations jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    )
  `)
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS translation_reference_locale_uidx
      ON translation (reference, reference_id, locale_code)
      WHERE deleted_at IS NULL
  `)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS translation_setting (
      id text PRIMARY KEY NOT NULL,
      entity_type text NOT NULL UNIQUE,
      fields jsonb NOT NULL DEFAULT '[]'::jsonb,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    )
  `)
}
