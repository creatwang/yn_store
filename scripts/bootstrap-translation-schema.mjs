/**
 * 创建 translation / translation_setting 表（若不存在）。
 * 用法：DATABASE_URL=... node scripts/bootstrap-translation-schema.mjs
 */
import postgres from "postgres"
import "dotenv/config"

const sql = postgres(process.env.DATABASE_URL, { max: 1 })

try {
  await sql`
    CREATE TABLE IF NOT EXISTS translation (
      id text PRIMARY KEY,
      reference text NOT NULL,
      reference_id text NOT NULL,
      locale_code text NOT NULL,
      translations jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL,
      deleted_at timestamptz
    )
  `
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS translation_reference_locale_uidx
      ON translation (reference, reference_id, locale_code)
      WHERE deleted_at IS NULL
  `
  await sql`
    CREATE TABLE IF NOT EXISTS translation_setting (
      id text PRIMARY KEY,
      entity_type text NOT NULL UNIQUE,
      fields jsonb NOT NULL DEFAULT '[]'::jsonb,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL,
      deleted_at timestamptz
    )
  `
  console.log("translation schema ready")
} finally {
  await sql.end({ timeout: 5 })
}
