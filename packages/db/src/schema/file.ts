import { integer, pgTable, text } from "drizzle-orm/pg-core"
import { timestamps } from "./timestamps"

/** file — 文件记录表（Medusa File Module 对齐） */
export const file = pgTable("file", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  filename: text("filename").notNull(),
  mime_type: text("mime_type"),
  size: integer("size"),
  access_type: text("access_type").default("public").notNull(),
  provider_id: text("provider_id").default("local").notNull(),
  ...timestamps,
})
