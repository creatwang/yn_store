import { boolean, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { timestamps } from "./timestamps"

export const authIdentity = pgTable("auth_identity", {
  id: text("id").primaryKey(),
  app_metadata: jsonb("app_metadata"),
  ...timestamps,
})

export const providerIdentity = pgTable("provider_identity", {
  id: text("id").primaryKey(),
  entity_id: text("entity_id").notNull(),
  provider: text("provider").notNull(),
  auth_identity_id: text("auth_identity_id").notNull(),
  user_metadata: jsonb("user_metadata"),
  provider_metadata: jsonb("provider_metadata"),
  ...timestamps,
})

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  first_name: text("first_name"),
  last_name: text("last_name"),
  email: text("email").notNull(),
  avatar_url: text("avatar_url"),
  metadata: jsonb("metadata"),
  ...timestamps,
})

export const invite = pgTable("invite", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  accepted: boolean("accepted").default(false).notNull(),
  token: text("token").notNull(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  metadata: jsonb("metadata"),
  ...timestamps,
})
