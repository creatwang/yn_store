import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
} from "drizzle-orm/pg-core"
import { timestamps } from "./timestamps"

export const inventoryItem = pgTable("inventory_item", {
  id: text("id").primaryKey(),
  sku: text("sku"),
  origin_country: text("origin_country"),
  hs_code: text("hs_code"),
  mid_code: text("mid_code"),
  material: text("material"),
  weight: integer("weight"),
  length: integer("length"),
  height: integer("height"),
  width: integer("width"),
  requires_shipping: boolean("requires_shipping").default(true).notNull(),
  description: text("description"),
  title: text("title"),
  thumbnail: text("thumbnail"),
  metadata: jsonb("metadata"),
  ...timestamps,
})

export const inventoryLevel = pgTable("inventory_level", {
  id: text("id").primaryKey(),
  location_id: text("location_id").notNull(),
  stocked_quantity: numeric("stocked_quantity").default("0"),
  raw_stocked_quantity: jsonb("raw_stocked_quantity"),
  reserved_quantity: numeric("reserved_quantity").default("0"),
  raw_reserved_quantity: jsonb("raw_reserved_quantity"),
  incoming_quantity: numeric("incoming_quantity").default("0"),
  raw_incoming_quantity: jsonb("raw_incoming_quantity"),
  metadata: jsonb("metadata"),
  inventory_item_id: text("inventory_item_id").notNull(),
})

export const reservationItem = pgTable("reservation_item", {
  id: text("id").primaryKey(),
  line_item_id: text("line_item_id"),
  allow_backorder: boolean("allow_backorder").default(false).notNull(),
  location_id: text("location_id").notNull(),
  quantity: numeric("quantity").notNull(),
  raw_quantity: jsonb("raw_quantity").notNull(),
  external_id: text("external_id"),
  description: text("description"),
  created_by: text("created_by"),
  metadata: jsonb("metadata"),
  inventory_item_id: text("inventory_item_id").notNull(),
  ...timestamps,
})
