import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  text,
} from "drizzle-orm/pg-core"
import { timestamps } from "./timestamps"

export const product = pgTable("product", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  handle: text("handle").notNull(),
  subtitle: text("subtitle"),
  description: text("description"),
  is_giftcard: boolean("is_giftcard").default(false).notNull(),
  status: text("status").default("draft").notNull(),
  thumbnail: text("thumbnail"),
  weight: real("weight"),
  length: real("length"),
  height: real("height"),
  width: real("width"),
  origin_country: text("origin_country"),
  hs_code: text("hs_code"),
  mid_code: text("mid_code"),
  material: text("material"),
  discountable: boolean("discountable").default(true).notNull(),
  external_id: text("external_id"),
  metadata: jsonb("metadata"),
  type_id: text("type_id"),
  collection_id: text("collection_id"),
  ...timestamps,
})

export const productVariant = pgTable("product_variant", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  sku: text("sku"),
  barcode: text("barcode"),
  ean: text("ean"),
  upc: text("upc"),
  allow_backorder: boolean("allow_backorder").default(false).notNull(),
  manage_inventory: boolean("manage_inventory").default(true).notNull(),
  hs_code: text("hs_code"),
  origin_country: text("origin_country"),
  mid_code: text("mid_code"),
  material: text("material"),
  weight: real("weight"),
  length: real("length"),
  height: real("height"),
  width: real("width"),
  thumbnail: text("thumbnail"),
  metadata: jsonb("metadata"),
  variant_rank: integer("variant_rank").default(0),
  product_id: text("product_id").notNull(),
  ...timestamps,
})

export const productOption = pgTable("product_option", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  metadata: jsonb("metadata"),
  product_id: text("product_id").notNull(),
  ...timestamps,
})

export const productOptionValue = pgTable("product_option_value", {
  id: text("id").primaryKey(),
  value: text("value").notNull(),
  metadata: jsonb("metadata"),
  option_id: text("option_id").notNull(),
  ...timestamps,
})

export const productImage = pgTable("image", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  metadata: jsonb("metadata"),
  rank: integer("rank").default(0),
  product_id: text("product_id").notNull(),
  ...timestamps,
})

export const productVariantProductImage = pgTable("product_variant_product_image", {
  id: text("id").primaryKey(),
  variant_id: text("variant_id").notNull(),
  image_id: text("image_id").notNull(),
})

export const productTag = pgTable("product_tag", {
  id: text("id").primaryKey(),
  value: text("value").notNull(),
  external_id: text("external_id"),
  metadata: jsonb("metadata"),
  ...timestamps,
})

export const productType = pgTable("product_type", {
  id: text("id").primaryKey(),
  value: text("value").notNull(),
  external_id: text("external_id"),
  metadata: jsonb("metadata"),
  ...timestamps,
})

export const productCollection = pgTable("product_collection", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  handle: text("handle").notNull(),
  external_id: text("external_id"),
  metadata: jsonb("metadata"),
  ...timestamps,
})

export const productCategory = pgTable("product_category", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  handle: text("handle").notNull(),
  mpath: text("mpath").notNull(),
  is_active: boolean("is_active").default(false),
  is_internal: boolean("is_internal").default(false),
  rank: integer("rank").default(0),
  external_id: text("external_id"),
  metadata: jsonb("metadata"),
  parent_category_id: text("parent_category_id"),
  ...timestamps,
})
