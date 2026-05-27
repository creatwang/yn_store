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

/** 开发时 .env 变更后需重置连接池（一般由 tsx 重启进程，通常不必手动调用） */
export function resetDb() {
  _db = null
}
