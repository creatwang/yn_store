import {
  boolean,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { timestamps } from "./timestamps"

export const fulfillment = pgTable("fulfillment", {
  id: text("id").primaryKey(),
  location_id: text("location_id").notNull(),
  packed_at: timestamp("packed_at", { withTimezone: true }),
  shipped_at: timestamp("shipped_at", { withTimezone: true }),
  marked_shipped_by: text("marked_shipped_by"),
  created_by: text("created_by"),
  delivered_at: timestamp("delivered_at", { withTimezone: true }),
  canceled_at: timestamp("canceled_at", { withTimezone: true }),
  data: jsonb("data"),
  requires_shipping: boolean("requires_shipping").default(true).notNull(),
  metadata: jsonb("metadata"),
  shipping_option_id: text("shipping_option_id"),
  provider_id: text("provider_id"),
  ...timestamps,
})

export const fulfillmentItem = pgTable("fulfillment_item", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  sku: text("sku").notNull(),
  barcode: text("barcode").notNull(),
  quantity: numeric("quantity").notNull(),
  raw_quantity: jsonb("raw_quantity").notNull(),
  line_item_id: text("line_item_id"),
  inventory_item_id: text("inventory_item_id"),
  fulfillment_id: text("fulfillment_id").notNull(),
})

export const fulfillmentLabel = pgTable("fulfillment_label", {
  id: text("id").primaryKey(),
  tracking_number: text("tracking_number").notNull(),
  tracking_url: text("tracking_url").notNull(),
  label_url: text("label_url").notNull(),
  fulfillment_id: text("fulfillment_id").notNull(),
})

export const fulfillmentProvider = pgTable("fulfillment_provider", {
  id: text("id").primaryKey(),
  is_enabled: boolean("is_enabled").default(true).notNull(),
})

export const fulfillmentSet = pgTable("fulfillment_set", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  metadata: jsonb("metadata"),
  ...timestamps,
})

export const serviceZone = pgTable("service_zone", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  metadata: jsonb("metadata"),
  fulfillment_set_id: text("fulfillment_set_id").notNull(),
})

export const geoZone = pgTable("geo_zone", {
  id: text("id").primaryKey(),
  type: text("type").default("country").notNull(),
  country_code: text("country_code").notNull(),
  province_code: text("province_code"),
  city: text("city"),
  postal_expression: jsonb("postal_expression"),
  metadata: jsonb("metadata"),
  service_zone_id: text("service_zone_id").notNull(),
})

export const shippingOption = pgTable("shipping_option", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  data: jsonb("data"),
  metadata: jsonb("metadata"),
  service_zone_id: text("service_zone_id").notNull(),
  provider_id: text("provider_id"),
  type_id: text("type_id").notNull(),
  shipping_profile_id: text("shipping_profile_id"),
  ...timestamps,
})

export const shippingOptionRule = pgTable("shipping_option_rule", {
  id: text("id").primaryKey(),
  attribute: text("attribute").notNull(),
  operator: text("operator").notNull(),
  value: jsonb("value"),
  shipping_option_id: text("shipping_option_id").notNull(),
})

export const shippingOptionType = pgTable("shipping_option_type", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  description: text("description"),
  code: text("code").notNull(),
  ...timestamps,
})

export const shippingProfile = pgTable("shipping_profile", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  metadata: jsonb("metadata"),
  ...timestamps,
})

export const fulfillmentAddress = pgTable("fulfillment_address", {
  id: text("id").primaryKey(),
  company: text("company"),
  first_name: text("first_name"),
  last_name: text("last_name"),
  address_1: text("address_1"),
  address_2: text("address_2"),
  city: text("city"),
  country_code: text("country_code"),
  province: text("province"),
  postal_code: text("postal_code"),
  phone: text("phone"),
  metadata: jsonb("metadata"),
})
