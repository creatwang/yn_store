import { sql } from "drizzle-orm"
import { getDb } from "@my-store/db"
import { ensureTranslationSchema } from "../src/lib/translation"

/** 测试库与 Medusa 共用库时补齐本项目依赖、官方 schema 未建的表 */
export async function ensureTestDbSchema() {
  const db = getDb()
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "file" (
      id text PRIMARY KEY NOT NULL,
      url text NOT NULL,
      filename text NOT NULL,
      mime_type text,
      size integer,
      access_type text NOT NULL DEFAULT 'public',
      provider_id text NOT NULL DEFAULT 'local',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    )
  `)
  await ensureTranslationSchema()
}
