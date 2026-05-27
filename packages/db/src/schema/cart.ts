import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { timestamps } from "./timestamps"

export const cart = pgTable("cart", {
  id: text("id").primaryKey(),
  region_id: text("region_id"),
  customer_id: text("customer_id"),
  sales_channel_id: text("sales_channel_id"),
  email: text("email"),
  currency_code: text("currency_code").notNull(),
  locale: text("locale"),
  metadata: jsonb("metadata"),
  completed_at: timestamp("completed_at", { withTimezone: true }),
  ...timestamps,
})

export const cartLineItem = pgTable("cart_line_item", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  thumbnail: text("thumbnail"),
  quantity: integer("quantity").notNull(),
  variant_id: text("variant_id"),
  product_id: text("product_id"),
  product_title: text("product_title"),
  product_description: text("product_description"),
  product_subtitle: text("product_subtitle"),
  product_type: text("product_type"),
  product_type_id: text("product_type_id"),
  product_collection: text("product_collection"),
  product_handle: text("product_handle"),
  variant_sku: text("variant_sku"),
  variant_barcode: text("variant_barcode"),
  variant_title: text("variant_title"),
  variant_option_values: jsonb("variant_option_values"),
  requires_shipping: boolean("requires_shipping").default(true).notNull(),
  is_discountable: boolean("is_discountable").default(true).notNull(),
  is_giftcard: boolean("is_giftcard").default(false).notNull(),
  is_tax_inclusive: boolean("is_tax_inclusive").default(false).notNull(),
  is_custom_price: boolean("is_custom_price").default(false).notNull(),
  compare_at_unit_price: numeric("compare_at_unit_price"),
  raw_compare_at_unit_price: jsonb("raw_compare_at_unit_price"),
  unit_price: numeric("unit_price").notNull(),
  raw_unit_price: jsonb("raw_unit_price").notNull(),
  metadata: jsonb("metadata"),
  cart_id: text("cart_id").notNull(),
  ...timestamps,
})

export const cartLineItemAdjustment = pgTable("cart_line_item_adjustment", {
  id: text("id").primaryKey(),
  description: text("description"),
  code: text("code"),
  amount: numeric("amount").notNull(),
  raw_amount: jsonb("raw_amount").notNull(),
  is_tax_inclusive: boolean("is_tax_inclusive").default(false).notNull(),
  provider_id: text("provider_id"),
  promotion_id: text("promotion_id"),
  metadata: jsonb("metadata"),
  item_id: text("item_id").notNull(),
})

export const cartLineItemTaxLine = pgTable("cart_line_item_tax_line", {
  id: text("id").primaryKey(),
  description: text("description"),
  code: text("code").notNull(),
  rate: real("rate").notNull(),
  provider_id: text("provider_id"),
  tax_rate_id: text("tax_rate_id"),
  metadata: jsonb("metadata"),
  item_id: text("item_id").notNull(),
})

export const cartShippingMethod = pgTable("cart_shipping_method", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: jsonb("description"),
  amount: numeric("amount").notNull(),
  raw_amount: jsonb("raw_amount").notNull(),
  is_tax_inclusive: boolean("is_tax_inclusive").default(false).notNull(),
  shipping_option_id: text("shipping_option_id"),
  data: jsonb("data"),
  metadata: jsonb("metadata"),
  cart_id: text("cart_id").notNull(),
  ...timestamps,
})

export const cartShippingMethodAdjustment = pgTable("cart_shipping_method_adjustment", {
  id: text("id").primaryKey(),
  description: text("description"),
  code: text("code"),
  amount: numeric("amount").notNull(),
  raw_amount: jsonb("raw_amount").notNull(),
  provider_id: text("provider_id"),
  promotion_id: text("promotion_id"),
  metadata: jsonb("metadata"),
  shipping_method_id: text("shipping_method_id").notNull(),
})

export const cartShippingMethodTaxLine = pgTable("cart_shipping_method_tax_line", {
  id: text("id").primaryKey(),
  description: text("description"),
  code: text("code").notNull(),
  rate: real("rate").notNull(),
  provider_id: text("provider_id"),
  tax_rate_id: text("tax_rate_id"),
  metadata: jsonb("metadata"),
  shipping_method_id: text("shipping_method_id").notNull(),
})

export const cartAddress = pgTable("cart_address", {
  id: text("id").primaryKey(),
  customer_id: text("customer_id"),
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
  ...timestamps,
})

export const cartCreditLine = pgTable("cart_credit_line", {
  id: text("id").primaryKey(),
  reference: text("reference"),
  reference_id: text("reference_id"),
  amount: numeric("amount").notNull(),
  raw_amount: jsonb("raw_amount").notNull(),
  metadata: jsonb("metadata"),
  cart_id: text("cart_id").notNull(),
})
