import {
  boolean,
  jsonb,
  pgTable,
  text,
} from "drizzle-orm/pg-core"
import { timestamps } from "./timestamps"

export const customer = pgTable("customer", {
  id: text("id").primaryKey(),
  company_name: text("company_name"),
  first_name: text("first_name"),
  last_name: text("last_name"),
  email: text("email").notNull(),
  phone: text("phone"),
  has_account: boolean("has_account").default(false).notNull(),
  metadata: jsonb("metadata"),
  ...timestamps,
})

export const customerAddress = pgTable("customer_address", {
  id: text("id").primaryKey(),
  address_name: text("address_name"),
  is_default_shipping: boolean("is_default_shipping").default(false).notNull(),
  is_default_billing: boolean("is_default_billing").default(false).notNull(),
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
  customer_id: text("customer_id").notNull(),
  ...timestamps,
})

export const customerGroup = pgTable("customer_group", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  metadata: jsonb("metadata"),
  created_by: text("created_by"),
  ...timestamps,
})

export const customerGroupCustomer = pgTable("customer_group_customer", {
  id: text("id").primaryKey(),
  created_by: text("created_by"),
  metadata: jsonb("metadata"),
  customer_id: text("customer_id").notNull(),
  customer_group_id: text("customer_group_id").notNull(),
})
