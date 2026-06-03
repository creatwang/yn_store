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

function resolvePoolMax() {
  if (process.env.DB_POOL_MAX) return Number(process.env.DB_POOL_MAX)
  if (process.env.VITEST) return 3
  return 4
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

  const sql = postgres(connectionString, {
    max: resolvePoolMax(),
    idle_timeout: 20,
  })

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
