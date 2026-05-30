import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import type { Sql } from "postgres"
import * as schema from "./schema"

export type Database = ReturnType<typeof createDb>

let _db: Database | null = null
let _client: Sql | null = null

function resolvePoolMax() {
  if (process.env.DB_POOL_MAX) return Number(process.env.DB_POOL_MAX)
  // Supabase session pooler 默认 pool_size=15；Vitest 并行 worker 会各自建池
  if (process.env.VITEST) return 3
  return 10
}

export function createDb(connectionString: string) {
  const client = postgres(connectionString, {
    max: resolvePoolMax(),
    idle_timeout: 20,
  })
  _client = client
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

/** 测试 teardown：关闭 postgres 连接，释放 Supabase pool 槽位 */
export async function closeDb() {
  if (_client) {
    await _client.end({ timeout: 5 })
    _client = null
  }
  _db = null
}
