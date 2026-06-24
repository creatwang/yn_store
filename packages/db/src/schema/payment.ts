import {
  boolean,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { timestamps } from "./timestamps"

export const paymentCollection = pgTable("payment_collection", {
  id: text("id").primaryKey(),
  currency_code: text("currency_code").notNull(),
  amount: numeric("amount").notNull(),
  raw_amount: jsonb("raw_amount").notNull(),
  authorized_amount: numeric("authorized_amount"),
  captured_amount: numeric("captured_amount"),
  refunded_amount: numeric("refunded_amount"),
  completed_at: timestamp("completed_at", { withTimezone: true }),
  status: text("status"),
  metadata: jsonb("metadata"),
  ...timestamps,
})

export const paymentSession = pgTable("payment_session", {
  id: text("id").primaryKey(),
  currency_code: text("currency_code").notNull(),
  amount: numeric("amount").notNull(),
  raw_amount: jsonb("raw_amount").notNull(),
  provider_id: text("provider_id").notNull(),
  data: jsonb("data").default({}),
  context: jsonb("context"),
  authorized_at: timestamp("authorized_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
  payment_collection_id: text("payment_collection_id").notNull(),
  ...timestamps,
})

export const payment = pgTable("payment", {
  id: text("id").primaryKey(),
  amount: numeric("amount").notNull(),
  raw_amount: jsonb("raw_amount").notNull(),
  currency_code: text("currency_code").notNull(),
  provider_id: text("provider_id").notNull(),
  data: jsonb("data"),
  metadata: jsonb("metadata"),
  captured_at: timestamp("captured_at", { withTimezone: true }),
  canceled_at: timestamp("canceled_at", { withTimezone: true }),
  payment_collection_id: text("payment_collection_id").notNull(),
  payment_session_id: text("payment_session_id").notNull(),
  ...timestamps,
})

export const capture = pgTable("capture", {
  id: text("id").primaryKey(),
  amount: numeric("amount").notNull(),
  raw_amount: jsonb("raw_amount").notNull(),
  metadata: jsonb("metadata"),
  created_by: text("created_by"),
  payment_id: text("payment_id").notNull(),
})

export const refund = pgTable("refund", {
  id: text("id").primaryKey(),
  amount: numeric("amount").notNull(),
  raw_amount: jsonb("raw_amount").notNull(),
  note: text("note"),
  metadata: jsonb("metadata"),
  created_by: text("created_by"),
  payment_id: text("payment_id").notNull(),
  refund_reason_id: text("refund_reason_id"),
})

export const refundReason = pgTable("refund_reason", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  code: text("code").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"),
  ...timestamps,
})

export const paymentProvider = pgTable("payment_provider", {
  id: text("id").primaryKey(),
  is_enabled: boolean("is_enabled").default(true).notNull(),
})

/** 区域 ↔ 支付渠道（Medusa link 表） */
export const regionPaymentProvider = pgTable(
  "region_payment_provider",
  {
    region_id: text("region_id").notNull(),
    payment_provider_id: text("payment_provider_id").notNull(),
  },
)

export const accountHolder = pgTable("account_holder", {
  id: text("id").primaryKey(),
  provider_id: text("provider_id").notNull(),
  external_id: text("external_id").notNull(),
  email: text("email"),
  data: jsonb("data").default({}),
  metadata: jsonb("metadata"),
})
