#!/usr/bin/env node
/**
 * 删除自研兜底建表留下的错误促销 schema（与官方 Medusa v2 并存部分）。
 *
 * 会删除：
 * - 错误表名 application_method（官方为 promotion_application_method）
 * - 自研错误表 campaign_budget / campaign_budget_usage（官方为 promotion_campaign_budget*）
 * - promotion_rule 上自研多加的 promotion_id / application_method_id 列（若存在）
 * - promotion.metadata 里自研折扣字段 application_type / value 等
 *
 * 不会删除官方表：promotion_application_method、promotion_promotion_rule、
 * application_method_target_rules、application_method_buy_rules 等。
 *
 * 用法：pnpm db:drop-legacy-promotion
 * 需 apps/server/.env 中 DATABASE_URL
 */
import { existsSync, readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import postgres from "postgres"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const envPath = resolve(root, "apps/server/.env")

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  if (!existsSync(envPath)) return null
  const text = readFileSync(envPath, "utf8")
  const m = text.match(/^\s*DATABASE_URL\s*=\s*["']?([^"'\n#]+)/m)
  return m?.[1]?.trim() ?? null
}

const url = loadDatabaseUrl()
if (!url) {
  console.error("[drop-legacy-promotion] 未找到 DATABASE_URL")
  process.exit(1)
}

const sql = postgres(url, { max: 1 })

const steps = [
  {
    label: "DROP TABLE application_method (legacy wrong name)",
    query: `DROP TABLE IF EXISTS "application_method" CASCADE`,
  },
  {
    label: "DROP TABLE campaign_budget (legacy wrong name)",
    query: `DROP TABLE IF EXISTS "campaign_budget" CASCADE`,
  },
  {
    label: "DROP TABLE campaign_budget_usage (legacy wrong name)",
    query: `DROP TABLE IF EXISTS "campaign_budget_usage" CASCADE`,
  },
  {
    label: "DROP COLUMN promotion_rule.promotion_id (if legacy)",
    query: `
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'promotion_rule'
            AND column_name = 'promotion_id'
        ) THEN
          ALTER TABLE "promotion_rule" DROP COLUMN "promotion_id";
        END IF;
      END $$`,
  },
  {
    label: "DROP COLUMN promotion_rule.application_method_id (if legacy)",
    query: `
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'promotion_rule'
            AND column_name = 'application_method_id'
        ) THEN
          ALTER TABLE "promotion_rule" DROP COLUMN "application_method_id";
        END IF;
      END $$`,
  },
  {
    label: "Strip legacy discount keys from promotion.metadata",
    query: `
      UPDATE "promotion"
      SET metadata = metadata
        - 'application_type'
        - 'value'
        - 'target_type'
        - 'allocation'
        - 'currency_code'
        - 'max_quantity'
        - 'apply_to_quantity'
        - 'buy_rules_min_quantity'
      WHERE metadata IS NOT NULL`,
  },
]

async function main() {
  console.log("[drop-legacy-promotion] 开始清理…")
  for (const step of steps) {
    console.log(`  → ${step.label}`)
    await sql.unsafe(step.query)
  }
  await sql.end({ timeout: 5 })
  console.log("[drop-legacy-promotion] 完成。请使用官方 npx medusa db:migrate 维护促销表。")
}

main().catch((err) => {
  console.error("[drop-legacy-promotion] 失败:", err)
  process.exit(1)
})
