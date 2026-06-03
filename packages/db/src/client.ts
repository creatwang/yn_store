import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import type { Sql } from "postgres"
import * as schema from "./schema"

const GLOBAL_DB_KEY = "__myStoreDbSingleton__" as const

type DbSingleton = {
  drizzle: Database
  sql: Sql
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

function isSupabaseSessionPooler(connectionString: string) {
  return (
    connectionString.includes("pooler.supabase.com") &&
    /:5432(\/|$)/.test(connectionString)
  )
}

function isSupabaseTransactionPooler(connectionString: string) {
  return (
    connectionString.includes("pooler.supabase.com") &&
    /:6543(\/|$)/.test(connectionString)
  )
}

/**
 * :5432 Session pooler — 贴近 Postgres 直连名额（全项目约十余条），僵尸 idle 易顶满。
 * :6543 Transaction pooler — 云端池化，可承载远高于直连的客户端并发；需 prepare: false。
 */
function resolvePoolMax(connectionString: string) {
  if (process.env.DB_POOL_MAX) return Number(process.env.DB_POOL_MAX)
  if (process.env.VITEST) return 2
  if (isSupabaseSessionPooler(connectionString)) return 2
  if (isSupabaseTransactionPooler(connectionString)) return 10
  return 4
}

function postgresClientOptions(connectionString: string) {
  const sessionPooler = isSupabaseSessionPooler(connectionString)
  const options: Parameters<typeof postgres>[1] = {
    max: resolvePoolMax(connectionString),
    idle_timeout: sessionPooler ? 10 : 20,
    max_lifetime: 60 * 10,
    connect_timeout: 15
  }
  if (isSupabaseTransactionPooler(connectionString)) {
    options.prepare = false
  }
  return options
}

export function describeDbPool(connectionString: string) {
  const max = resolvePoolMax(connectionString)
  const mode = isSupabaseTransactionPooler(connectionString)
    ? "transaction-pooler:6543"
    : isSupabaseSessionPooler(connectionString)
      ? "session-pooler:5432"
      : "direct/other"
  const hint =
    mode === "transaction-pooler:6543"
      ? "云端池化，本地 max=10 通常安全；可按需 DB_POOL_MAX=20"
      : mode === "session-pooler:5432"
        ? "共享直连名额约 ~15，建议改 :6543 或 DB_POOL_MAX=2"
        : undefined
  return { max, mode, singleton: "globalThis per process", hint }
}

function createDrizzleInstance(sql: Sql) {
  return drizzle(sql, { schema })
}

export type Database = ReturnType<typeof createDrizzleInstance>

function attachSingleton(connectionString: string): Database {
  const existing = readSingleton()
  if (existing?.connectionString === connectionString) {
    return existing.drizzle
  }

  if (existing) {
    void existing.sql.end({ timeout: 5 }).catch(() => {})
  }

  const sql = postgres(connectionString, postgresClientOptions(connectionString))

  const entry: DbSingleton = {
    sql,
    drizzle: createDrizzleInstance(sql),
    connectionString,
  }

  writeSingleton(entry)
  return entry.drizzle
}

/**
 * 创建或复用全局连接池（同一 connectionString 不会重复建池）。
 * 测试注入请优先用 setDb / replaceDb / closeDb。
 */
export function createDb(connectionString: string): Database {
  return attachSingleton(connectionString)
}

/** 进程内唯一连接池；热更新复用 globalThis，避免重复 postgres() 实例 */
export function getDb(): Database {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL is not set")
  }
  return attachSingleton(url)
}

/** 与 getDb() 相同单例，便于 `db.select()` 写法 */
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

/** 测试注入：须与 createDb() 返回的实例一致，或先 createDb 再 setDb */
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

/** 测试 teardown / 切换库：关闭并清除全局池 */
export async function closeDb() {
  const current = readSingleton()
  writeSingleton(undefined)
  if (current) {
    await current.sql.end({ timeout: 5 }).catch(() => {})
  }
}
