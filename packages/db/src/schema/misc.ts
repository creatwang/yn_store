import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"
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
