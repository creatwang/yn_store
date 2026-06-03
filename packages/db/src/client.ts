import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import type { Sql } from "postgres"
import * as schema from "./schema"
import { DbConcurrencyGate } from "./db-gate"
import { wrapSqlWithGate } from "./gated-sql"
import {
  isSupabasePooler,
  resolveConnectTimeoutSec,
  resolveIdleTimeoutSec,
  resolveMaxLifetimeSec,
  resolveMaxWaitMs,
  resolvePoolMax,
} from "./pool-config"

export { describeDbPool, resolvePoolMax, resolveMaxWaitMs } from "./pool-config"
export { DbConcurrencyGate, DbPoolWaitTimeoutError } from "./db-gate"

const GLOBAL_DB_KEY = "__myStoreDbSingleton__" as const

type DbSingleton = {
  drizzle: Database
  sql: Sql
  gate: DbConcurrencyGate
  connectionString: string
}

type GlobalWithDb = typeof globalThis & {
  [GLOBAL_DB_KEY]?: DbSingleton
}

function getGlobalStore(): GlobalWithDb {
  return globalThis as GlobalWithDb
}

function readSingleton(): DbSingleton | undefined {
  return getGlobalStore()[GLOBAL_DB_KEY]
}

function writeSingleton(entry: DbSingleton | undefined) {
  if (entry) {
    getGlobalStore()[GLOBAL_DB_KEY] = entry
  } else {
    delete getGlobalStore()[GLOBAL_DB_KEY]
  }
}

function postgresClientOptions(connectionString: string) {
  const options: Parameters<typeof postgres>[1] = {
    max: resolvePoolMax(connectionString),
    idle_timeout: resolveIdleTimeoutSec(),
    max_lifetime: resolveMaxLifetimeSec(),
    connect_timeout: resolveConnectTimeoutSec(),
  }
  if (isSupabasePooler(connectionString)) {
    options.prepare = false
  }
  return options
}

function createDrizzleInstance(sql: Sql) {
  return drizzle(sql, { schema })
}

export type Database = ReturnType<typeof createDrizzleInstance>

export function getDbGateStats() {
  return readSingleton()?.gate.stats()
}

function attachSingleton(connectionString: string): Database {
  const existing = readSingleton()
  if (existing?.connectionString === connectionString) {
    return existing.drizzle
  }

  if (existing) {
    void existing.sql.end({ timeout: 5 }).catch(() => {})
  }

  const maxActive = resolvePoolMax(connectionString)
  const gate = new DbConcurrencyGate(maxActive, resolveMaxWaitMs())
  const raw = postgres(connectionString, postgresClientOptions(connectionString))
  const sql = wrapSqlWithGate(raw, gate)

  const entry: DbSingleton = {
    sql,
    gate,
    drizzle: createDrizzleInstance(sql),
    connectionString,
  }

  writeSingleton(entry)
  return entry.drizzle
}

export function createDb(connectionString: string): Database {
  return attachSingleton(connectionString)
}

export function getDb(): Database {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL is not set")
  }
  return attachSingleton(url)
}

export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    const instance = getDb()
    const value = Reflect.get(instance, prop, instance)
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(instance)
    }
    return value
  },
})

export function setDb(next: Database) {
  const current = readSingleton()
  if (current?.drizzle === next) {
    return
  }

  if (current) {
    writeSingleton({ ...current, drizzle: next })
    return
  }

  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("setDb: DATABASE_URL is not set; use createDb() first")
  }
  createDb(url)
}

export async function replaceDb(connectionString: string) {
  await closeDb()
  return createDb(connectionString)
}

export function resetDb() {
  writeSingleton(undefined)
}

export async function closeDb() {
  const current = readSingleton()
  writeSingleton(undefined)
  if (current) {
    await current.sql.end({ timeout: 5 }).catch(() => {})
  }
}
