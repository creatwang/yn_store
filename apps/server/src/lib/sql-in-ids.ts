import { sql, type SQL } from "drizzle-orm"

/** Postgres IN (...) — avoids broken ANY(${ids}::text[]) with postgres.js */
export function sqlInIds(column: SQL, ids: string[]): SQL {
  if (ids.length === 0) return sql`false`
  return sql`${column} IN (${sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  )})`
}
