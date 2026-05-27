import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

export type Database = ReturnType<typeof createDb>

let _db: Database | null = null

export function createDb(connectionString: string) {
  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
  })
  return drizzle(client, { schema })
}

export function getDb(): Database {
  if (!_db) {
    const url = process.env.DATABASE_URL
    if (!url) {
      throw new Error("DATABASE_URL is not set")
    }
    _db = createDb(url)
  }
  return _db
}

export function setDb(db: Database) {
  _db = db
}
