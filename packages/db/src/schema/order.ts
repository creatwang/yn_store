import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { timestamps } from "./timestamps"

export const order = pgTable("order", {
  id: text("id").primaryKey(),
  display_id: serial("display_id"),
  custom_display_id: text("custom_display_id"),
  region_id: text("region_id"),
  customer_id: text("customer_id"),
  version: integer("version").default(1).notNull(),
  sales_channel_id: text("sales_channel_id"),
  status: text("status").default("pending").notNull(),
  is_draft_order: boolean("is_draft_order").default(false).notNull(),
  email: text("email"),
  currency_code: text("currency_code").notNull(),
  shipping_address_id: text("shipping_address_id"),
  billing_address_id: text("billing_address_id"),
  locale: text("locale"),
  no_notification: boolean("no_notification"),
  metadata: jsonb("metadata"),
  canceled_at: timestamp("canceled_at", { withTimezone: true }),
  ...timestamps,
})

export const orderLineItem = pgTable("order_line_item", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  thumbnail: text("thumbnail"),
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
  is_giftcard: boolean("is_giftcard").default(false).notNull(),
  is_discountable: boolean("is_discountable").default(true).notNull(),
  is_tax_inclusive: boolean("is_tax_inclusive").default(false).notNull(),
  compare_at_unit_price: numeric("compare_at_unit_price"),
  raw_compare_at_unit_price: jsonb("raw_compare_at_unit_price"),
  unit_price: numeric("unit_price"),
  raw_unit_price: jsonb("raw_unit_price"),
  is_custom_price: boolean("is_custom_price").default(false).notNull(),
  metadata: jsonb("metadata"),
  ...timestamps,
})

export const orderLineItemAdjustment = pgTable("order_line_item_adjustment", {
  id: text("id").primaryKey(),
  version: integer("version").default(1).notNull(),
  description: text("description"),
  promotion_id: text("promotion_id"),
  code: text("code"),
  amount: numeric("amount").notNull(),
  raw_amount: jsonb("raw_amount").notNull(),
  provider_id: text("provider_id"),
  is_tax_inclusive: boolean("is_tax_inclusive").default(false).notNull(),
  item_id: text("item_id").notNull(),
})

export const orderLineItemTaxLine = pgTable("order_line_item_tax_line", {
  id: text("id").primaryKey(),
  description: text("description"),
  tax_rate_id: text("tax_rate_id"),
  code: text("code").notNull(),
  rate: numeric("rate").notNull(),
  raw_rate: jsonb("raw_rate").notNull(),
  provider_id: text("provider_id"),
  item_id: text("item_id").notNull(),
})

export const orderShippingMethod = pgTable("order_shipping_method", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: jsonb("description"),
  amount: numeric("amount").notNull(),
  raw_amount: jsonb("raw_amount").notNull(),
  is_tax_inclusive: boolean("is_tax_inclusive").default(false).notNull(),
  is_custom_amount: boolean("is_custom_amount").default(false).notNull(),
  shipping_option_id: text("shipping_option_id"),
  data: jsonb("data"),
  metadata: jsonb("metadata"),
  ...timestamps,
})

export const orderShippingMethodAdjustment = pgTable("order_shipping_method_adjustment", {
  id: text("id").primaryKey(),
  version: integer("version").default(1).notNull(),
  description: text("description"),
  promotion_id: text("promotion_id"),
  code: text("code"),
  amount: numeric("amount").notNull(),
  raw_amount: jsonb("raw_amount").notNull(),
  provider_id: text("provider_id"),
  shipping_method_id: text("shipping_method_id").notNull(),
})

export const orderShippingMethodTaxLine = pgTable("order_shipping_method_tax_line", {
  id: text("id").primaryKey(),
  description: text("description"),
  tax_rate_id: text("tax_rate_id"),
  code: text("code").notNull(),
  rate: numeric("rate").notNull(),
  raw_rate: jsonb("raw_rate").notNull(),
  provider_id: text("provider_id"),
  shipping_method_id: text("shipping_method_id").notNull(),
})

export const orderItem = pgTable("order_item", {
  id: text("id").primaryKey(),
  version: integer("version").default(1).notNull(),
  unit_price: numeric("unit_price"),
  raw_unit_price: jsonb("raw_unit_price"),
  compare_at_unit_price: numeric("compare_at_unit_price"),
  raw_compare_at_unit_price: jsonb("raw_compare_at_unit_price"),
  quantity: numeric("quantity").notNull(),
  raw_quantity: jsonb("raw_quantity").notNull(),
  fulfilled_quantity: numeric("fulfilled_quantity").default("0"),
  raw_fulfilled_quantity: jsonb("raw_fulfilled_quantity"),
  delivered_quantity: numeric("delivered_quantity").default("0"),
  raw_delivered_quantity: jsonb("raw_delivered_quantity"),
  shipped_quantity: numeric("shipped_quantity").default("0"),
  raw_shipped_quantity: jsonb("raw_shipped_quantity"),
  return_requested_quantity: numeric("return_requested_quantity").default("0"),
  return_received_quantity: numeric("return_received_quantity").default("0"),
  return_dismissed_quantity: numeric("return_dismissed_quantity").default("0"),
  written_off_quantity: numeric("written_off_quantity").default("0"),
  metadata: jsonb("metadata"),
  order_id: text("order_id").notNull(),
  item_id: text("item_id").notNull(),
})

export const orderChange = pgTable("order_change", {
  id: text("id").primaryKey(),
  return_id: text("return_id"),
  claim_id: text("claim_id"),
  exchange_id: text("exchange_id"),
  version: integer("version").notNull(),
  change_type: text("change_type"),
  status: text("status").default("pending"),
  description: text("description"),
  internal_note: text("internal_note"),
  created_by: text("created_by"),
  requested_by: text("requested_by"),
  requested_at: timestamp("requested_at", { withTimezone: true }),
  confirmed_by: text("confirmed_by"),
  confirmed_at: timestamp("confirmed_at", { withTimezone: true }),
  declined_by: text("declined_by"),
  declined_reason: text("declined_reason"),
  declined_at: timestamp("declined_at", { withTimezone: true }),
  canceled_by: text("canceled_by"),
  canceled_at: timestamp("canceled_at", { withTimezone: true }),
  carry_over_promotions: boolean("carry_over_promotions"),
  metadata: jsonb("metadata"),
  order_id: text("order_id").notNull(),
  ...timestamps,
})

/** order_change_action — 订单变更的操作记录（对齐 Medusa） */
export const orderChangeAction = pgTable("order_change_action", {
  id: text("id").primaryKey(),
  order_id: text("order_id").notNull(),
  order_change_id: text("order_change_id"),
  return_id: text("return_id"),
  claim_id: text("claim_id"),
  exchange_id: text("exchange_id"),
  ordering: integer("ordering"),
  version: integer("version"),
  reference: text("reference"),
  reference_id: text("reference_id"),
  action: text("action").notNull(),
  details: jsonb("details").default({}),
  amount: numeric("amount"),
  raw_amount: jsonb("raw_amount"),
  ...timestamps,
})

export const orderSummary = pgTable("order_summary", {
  id: text("id").primaryKey(),
  version: integer("version").default(1).notNull(),
  totals: jsonb("totals").notNull(),
  order_id: text("order_id").notNull(),
})

export const orderAddress = pgTable("order_address", {
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

export const orderTransaction = pgTable("order_transaction", {
  id: text("id").primaryKey(),
  version: integer("version").default(1).notNull(),
  amount: numeric("amount").notNull(),
  raw_amount: jsonb("raw_amount").notNull(),
  currency_code: text("currency_code").notNull(),
  reference: text("reference"),
  reference_id: text("reference_id"),
  order_id: text("order_id").notNull(),
})

export const orderReturn = pgTable("return", {
  id: text("id").primaryKey(),
  order_version: integer("order_version").notNull(),
  display_id: serial("display_id"),
  status: text("status").default("open").notNull(),
  location_id: text("location_id"),
  no_notification: boolean("no_notification"),
  refund_amount: numeric("refund_amount"),
  raw_refund_amount: jsonb("raw_refund_amount"),
  created_by: text("created_by"),
  metadata: jsonb("metadata"),
  requested_at: timestamp("requested_at", { withTimezone: true }),
  received_at: timestamp("received_at", { withTimezone: true }),
  canceled_at: timestamp("canceled_at", { withTimezone: true }),
  order_id: text("order_id").notNull(),
  ...timestamps,
})

export const returnItem = pgTable("return_item", {
  id: text("id").primaryKey(),
  quantity: numeric("quantity").notNull(),
  raw_quantity: jsonb("raw_quantity").notNull(),
  received_quantity: numeric("received_quantity").default("0"),
  damaged_quantity: numeric("damaged_quantity").default("0"),
  note: text("note"),
  metadata: jsonb("metadata"),
  return_id: text("return_id").notNull(),
  item_id: text("item_id").notNull(),
})

export const returnReason = pgTable("return_reason", {
  id: text("id").primaryKey(),
  value: text("value").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"),
  parent_return_reason_id: text("parent_return_reason_id"),
  ...timestamps,
})

export const orderClaim = pgTable("order_claim", {
  id: text("id").primaryKey(),
  order_version: integer("order_version").notNull(),
  display_id: serial("display_id"),
  type: text("type").notNull(),
  no_notification: boolean("no_notification"),
  refund_amount: numeric("refund_amount"),
  raw_refund_amount: jsonb("raw_refund_amount"),
  created_by: text("created_by"),
  canceled_at: timestamp("canceled_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
  order_id: text("order_id").notNull(),
  ...timestamps,
})

export const orderClaimItem = pgTable("order_claim_item", {
  id: text("id").primaryKey(),
  reason: text("reason"),
  quantity: numeric("quantity").notNull(),
  raw_quantity: jsonb("raw_quantity").notNull(),
  is_additional_item: boolean("is_additional_item").default(false).notNull(),
  note: text("note"),
  metadata: jsonb("metadata"),
  claim_id: text("claim_id").notNull(),
  item_id: text("item_id").notNull(),
})

export const orderExchange = pgTable("order_exchange", {
  id: text("id").primaryKey(),
  order_version: integer("order_version").notNull(),
  display_id: serial("display_id"),
  no_notification: boolean("no_notification"),
  difference_due: numeric("difference_due"),
  raw_difference_due: jsonb("raw_difference_due"),
  allow_backorder: boolean("allow_backorder").default(false).notNull(),
  created_by: text("created_by"),
  canceled_at: timestamp("canceled_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
  order_id: text("order_id").notNull(),
  ...timestamps,
})

export const orderCreditLine = pgTable("order_credit_line", {
  id: text("id").primaryKey(),
  order_id: text("order_id").notNull(),
  version: integer("version").default(1).notNull(),
  reference: text("reference"),
  reference_id: text("reference_id"),
  amount: numeric("amount").notNull(),
  raw_amount: jsonb("raw_amount").notNull(),
  metadata: jsonb("metadata"),
  ...timestamps,
})

export const orderPromotion = pgTable("order_promotion", {
  id: text("id").primaryKey(),
  order_id: text("order_id").notNull(),
  promotion_id: text("promotion_id").notNull(),
  ...timestamps,
})
