import { getDb } from "@my-store/db"

export type DbTx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0]

/** Drizzle 跨表写事务（PostgreSQL） */
export async function runInTransaction<T>(
  fn: (tx: DbTx) => Promise<T>,
): Promise<T> {
  return getDb().transaction(fn)
}
