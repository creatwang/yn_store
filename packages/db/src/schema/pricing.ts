import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { timestamps } from "./timestamps"

export const priceSet = pgTable("price_set", {
  id: text("id").primaryKey(),
})

export const price = pgTable("price", {
  id: text("id").primaryKey(),
  title: text("title"),
  currency_code: text("currency_code").notNull(),
  amount: numeric("amount").notNull(),
  raw_amount: jsonb("raw_amount").notNull(),
  min_quantity: numeric("min_quantity"),
  raw_min_quantity: jsonb("raw_min_quantity"),
  max_quantity: numeric("max_quantity"),
  raw_max_quantity: jsonb("raw_max_quantity"),
  rules_count: integer("rules_count").default(0),
  price_set_id: text("price_set_id").notNull(),
  price_list_id: text("price_list_id"),
  ...timestamps,
})

export const priceList = pgTable("price_list", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").default("draft").notNull(),
  type: text("type").default("sale").notNull(),
  starts_at: timestamp("starts_at", { withTimezone: true }),
  ends_at: timestamp("ends_at", { withTimezone: true }),
  rules_count: integer("rules_count").default(0),
  metadata: jsonb("metadata"),
  ...timestamps,
})

export const priceListRule = pgTable("price_list_rule", {
  id: text("id").primaryKey(),
  attribute: text("attribute").notNull(),
  value: jsonb("value"),
  price_list_id: text("price_list_id").notNull(),
})

export const priceRule = pgTable("price_rule", {
  id: text("id").primaryKey(),
  attribute: text("attribute").notNull(),
  value: text("value").notNull(),
  operator: text("operator").default("eq").notNull(),
  priority: integer("priority").default(0),
  price_id: text("price_id").notNull(),
})

export const pricePreference = pgTable("price_preference", {
  id: text("id").primaryKey(),
  attribute: text("attribute").notNull(),
  value: text("value"),
  is_tax_inclusive: boolean("is_tax_inclusive").default(false).notNull(),
  ...timestamps,
})
