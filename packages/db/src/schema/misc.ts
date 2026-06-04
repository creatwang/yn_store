import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { timestamps } from "./timestamps"

// promotion 表
export const promotion = pgTable("promotion", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  campaign_id: text("campaign_id"),
  is_automatic: boolean("is_automatic").default(false).notNull(),
  type: text("type").notNull(),
  status: text("status").default("draft").notNull(),
  is_tax_inclusive: boolean("is_tax_inclusive").default(false).notNull(),
  limit: integer("limit"),
  used: integer("used").default(0).notNull(),
  metadata: jsonb("metadata"),
  ...timestamps,
})

// promotion_campaign 表
export const promotionCampaign = pgTable("promotion_campaign", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  campaign_identifier: text("campaign_identifier").notNull(),
  starts_at: timestamp("starts_at", { withTimezone: true }),
  ends_at: timestamp("ends_at", { withTimezone: true }),
  ...timestamps,
})

// api_key 表
export const apiKey = pgTable("api_key", {
  id: text("id").primaryKey(),
  token: text("token").notNull(),
  salt: text("salt").notNull(),
  redacted: text("redacted").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  last_used_at: timestamp("last_used_at", { withTimezone: true }),
  created_by: text("created_by").notNull(),
  revoked_by: text("revoked_by"),
  revoked_at: timestamp("revoked_at", { withTimezone: true }),
  ...timestamps,
})

// notification 表
export const notification = pgTable("notification", {
  id: text("id").primaryKey(),
  to: text("to").notNull(),
  channel: text("channel").notNull(),
  template: text("template"),
  data: jsonb("data"),
  trigger_type: text("trigger_type"),
  resource_id: text("resource_id"),
  resource_type: text("resource_type"),
  receiver_id: text("receiver_id"),
  original_notification_id: text("original_notification_id"),
  idempotency_key: text("idempotency_key"),
  external_id: text("external_id"),
  provider_id: text("provider_id"),
  status: text("status").default("pending").notNull(),
  from: text("from"),
  provider_data: jsonb("provider_data"),
  ...timestamps,
})

// workflow_execution 表
export const workflowExecution = pgTable("workflow_execution", {
  id: text("id").primaryKey(),
  workflow_id: text("workflow_id").notNull(),
  transaction_id: text("transaction_id").notNull(),
  execution: jsonb("execution"),
  context: jsonb("context"),
  state: text("state").notNull(),
  retention_time: integer("retention_time"),
  run_id: text("run_id").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  deleted_at: timestamp("deleted_at"),
})

// property_label 表
export const propertyLabel = pgTable("property_label", {
  id: text("id").primaryKey(),
  entity: text("entity").notNull(),
  property: text("property").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  ...timestamps,
})

// view_configuration 表
export const viewConfiguration = pgTable("view_configuration", {
  id: text("id").primaryKey(),
  entity: text("entity").notNull(),
  name: text("name"),
  user_id: text("user_id"),
  is_system_default: boolean("is_system_default").default(false).notNull(),
  configuration: jsonb("configuration").notNull(),
  ...timestamps,
})

// ── Promotion 规则引擎（对齐 Medusa v2 Promotion Module）──

/** promotion_rule — 与官方一致，关联通过 pivot 表 */
export const promotionRule = pgTable("promotion_rule", {
  id: text("id").primaryKey(),
  description: text("description"),
  attribute: text("attribute").notNull(),
  operator: text("operator").notNull(),
  ...timestamps,
})

/** promotion_rule_value */
export const promotionRuleValue = pgTable("promotion_rule_value", {
  id: text("id").primaryKey(),
  value: text("value").notNull(),
  promotion_rule_id: text("promotion_rule_id").notNull(),
  ...timestamps,
})

/** 官方表 promotion_application_method；勿使用已废弃的 application_method */
export const applicationMethod = pgTable("promotion_application_method", {
  id: text("id").primaryKey(),
  value: numeric("value"),
  raw_value: jsonb("raw_value"),
  currency_code: text("currency_code"),
  max_quantity: integer("max_quantity"),
  type: text("type").notNull(),
  target_type: text("target_type").notNull(),
  allocation: text("allocation"),
  apply_to_quantity: integer("apply_to_quantity"),
  buy_rules_min_quantity: integer("buy_rules_min_quantity"),
  promotion_id: text("promotion_id").notNull(),
  ...timestamps,
})

/** promotion ↔ 购物车级 rules */
export const promotionPromotionRule = pgTable(
  "promotion_promotion_rule",
  {
    promotion_id: text("promotion_id").notNull(),
    promotion_rule_id: text("promotion_rule_id").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.promotion_id, t.promotion_rule_id] }),
  }),
)

/** application_method ↔ target rules */
export const applicationMethodTargetRules = pgTable(
  "application_method_target_rules",
  {
    application_method_id: text("application_method_id").notNull(),
    promotion_rule_id: text("promotion_rule_id").notNull(),
  },
  (t) => ({
    pk: primaryKey({
      columns: [t.application_method_id, t.promotion_rule_id],
    }),
  }),
)

/** application_method ↔ buy rules */
export const applicationMethodBuyRules = pgTable(
  "application_method_buy_rules",
  {
    application_method_id: text("application_method_id").notNull(),
    promotion_rule_id: text("promotion_rule_id").notNull(),
  },
  (t) => ({
    pk: primaryKey({
      columns: [t.application_method_id, t.promotion_rule_id],
    }),
  }),
)

// ── Campaign 预算（官方 promotion_campaign_budget）──

export const campaignBudget = pgTable("promotion_campaign_budget", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  currency_code: text("currency_code"),
  limit: numeric("limit"),
  raw_limit: jsonb("raw_limit"),
  used: numeric("used").default("0").notNull(),
  raw_used: jsonb("raw_used").notNull(),
  attribute: text("attribute"),
  campaign_id: text("campaign_id").notNull(),
  ...timestamps,
})

export const campaignBudgetUsage = pgTable(
  "promotion_campaign_budget_usage",
  {
    id: text("id").primaryKey(),
    attribute_value: text("attribute_value"),
    used: numeric("used").default("0").notNull(),
    raw_used: jsonb("raw_used").notNull(),
    budget_id: text("budget_id").notNull(),
    ...timestamps,
  },
)

// ── Promotion 关联表 ────────────────────────────

/** cart_promotion — 官方 link，含 id（前缀 cartpromo） */
export const cartPromotion = pgTable("cart_promotion", {
  id: text("id").primaryKey(),
  cart_id: text("cart_id").notNull(),
  promotion_id: text("promotion_id").notNull(),
})

// ── Notification Provider ───────────────────────

/** notification_provider — 通知渠道提供者 */
export const notificationProvider = pgTable("notification_provider", {
  id: text("id").primaryKey(),
  handle: text("handle").notNull(),
  name: text("name").notNull(),
  is_enabled: boolean("is_enabled").default(true).notNull(),
  channels: jsonb("channels"),
  ...timestamps,
})
