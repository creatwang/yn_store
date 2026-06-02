import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
} from "drizzle-orm/pg-core"
import { timestamps } from "./timestamps"

export const region = pgTable("region", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  currency_code: text("currency_code").notNull(),
  automatic_taxes: boolean("automatic_taxes").default(true).notNull(),
  metadata: jsonb("metadata"),
  ...timestamps,
})

export const country = pgTable("country", {
  iso_2: text("iso_2").primaryKey(),
  iso_3: text("iso_3"),
  num_code: integer("num_code"),
  name: text("name").notNull(),
  display_name: text("display_name").notNull(),
  metadata: jsonb("metadata"),
  region_id: text("region_id"),
})

export const currency = pgTable("currency", {
  code: text("code").primaryKey(),
  symbol: text("symbol").notNull(),
  symbol_native: text("symbol_native").notNull(),
  name: text("name").notNull(),
  decimal_digits: integer("decimal_digits").default(0),
  rounding: integer("rounding").default(0),
})

export const salesChannel = pgTable("sales_channel", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  is_disabled: boolean("is_disabled").default(false).notNull(),
  metadata: jsonb("metadata"),
  ...timestamps,
})

export const store = pgTable("store", {
  id: text("id").primaryKey(),
  name: text("name").default("Medusa Store").notNull(),
  default_sales_channel_id: text("default_sales_channel_id"),
  default_region_id: text("default_region_id"),
  default_location_id: text("default_location_id"),
  metadata: jsonb("metadata"),
  ...timestamps,
})

export const storeCurrency = pgTable("store_currency", {
  id: text("id").primaryKey(),
  currency_code: text("currency_code").notNull(),
  is_default: boolean("is_default").default(false).notNull(),
  store_id: text("store_id").notNull(),
})

export const storeLocale = pgTable("store_locale", {
  id: text("id").primaryKey(),
  locale_code: text("locale_code").notNull(),
  store_id: text("store_id").notNull(),
})

export const stockLocation = pgTable("stock_location", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  metadata: jsonb("metadata"),
  ...timestamps,
})

export const stockLocationAddress = pgTable("stock_location_address", {
  id: text("id").primaryKey(),
  address_1: text("address_1"),
  address_2: text("address_2"),
  company: text("company"),
  city: text("city"),
  country_code: text("country_code"),
  phone: text("phone"),
  province: text("province"),
  postal_code: text("postal_code"),
  metadata: jsonb("metadata"),
})

export const taxRegion = pgTable("tax_region", {
  id: text("id").primaryKey(),
  country_code: text("country_code"),
  province_code: text("province_code"),
  metadata: jsonb("metadata"),
  created_by: text("created_by"),
  parent_id: text("parent_id"),
  ...timestamps,
})

export const taxRate = pgTable("tax_rate", {
  id: text("id").primaryKey(),
  rate: numeric("rate"),
  code: text("code"),
  name: text("name"),
  is_default: boolean("is_default").default(false).notNull(),
  is_combinable: boolean("is_combinable").default(false).notNull(),
  metadata: jsonb("metadata"),
  created_by: text("created_by"),
  tax_region_id: text("tax_region_id"),
  ...timestamps,
})

export const taxRateRule = pgTable("tax_rate_rule", {
  id: text("id").primaryKey(),
  reference: text("reference").notNull(),
  reference_id: text("reference_id").notNull(),
  metadata: jsonb("metadata"),
  created_by: text("created_by"),
  tax_rate_id: text("tax_rate_id").notNull(),
  ...timestamps,
})

export const taxProvider = pgTable("tax_provider", {
  id: text("id").primaryKey(),
  is_enabled: boolean("is_enabled").default(true).notNull(),
})
