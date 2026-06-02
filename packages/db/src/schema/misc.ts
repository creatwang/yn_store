import { boolean, integer, jsonb, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core"
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

// ── Promotion 规则引擎 ──────────────────────────

/** promotion_rule — 促销规则（rules / buy-rules / target-rules 共用） */
export const promotionRule = pgTable("promotion_rule", {
  id: text("id").primaryKey(),
  description: text("description"),
  attribute: text("attribute").notNull(),
  operator: text("operator").notNull(),
  promotion_id: text("promotion_id"),
  application_method_id: text("application_method_id"),
  ...timestamps,
})

/** promotion_rule_value — 规则值列表（一条规则可有多个 IN 值） */
export const promotionRuleValue = pgTable("promotion_rule_value", {
  id: text("id").primaryKey(),
  value: text("value").notNull(),
  promotion_rule_id: text("promotion_rule_id").notNull(),
  ...timestamps,
})

/** application_method — 促销应用方式（折扣类型、金额、上限等） */
export const applicationMethod = pgTable("application_method", {
  id: text("id").primaryKey(),
  description: text("description"),
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

// ── Campaign 预算 ───────────────────────────────

/** campaign_budget — 活动预算（spend / usage） */
export const campaignBudget = pgTable("campaign_budget", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  currency_code: text("currency_code"),
  limit: integer("limit"),
  used: integer("used").default(0).notNull(),
  attribute: text("attribute"),
  campaign_id: text("campaign_id").notNull(),
  ...timestamps,
})

/** campaign_budget_usage — 预算按 attribute 配额使用记录 */
export const campaignBudgetUsage = pgTable("campaign_budget_usage", {
  id: text("id").primaryKey(),
  attribute_value: text("attribute_value"),
  used: integer("used").default(0).notNull(),
  budget_id: text("budget_id").notNull(),
  ...timestamps,
})

// ── Promotion 关联表 ────────────────────────────

/** cart_promotion — 购物车 ↔ 促销（多对多） */
export const cartPromotion = pgTable("cart_promotion", {
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
