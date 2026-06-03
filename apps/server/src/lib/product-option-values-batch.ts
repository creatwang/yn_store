import { asc, inArray } from "drizzle-orm"
import { productOptionValue } from "@my-store/db"
import type { getDb } from "@my-store/db"

type Db = ReturnType<typeof getDb>
type OptionRow = { id: string; [key: string]: unknown }
type ValueRow = typeof productOptionValue.$inferSelect

function groupValuesByOptionId(rows: ValueRow[]) {
  const map = new Map<string, ValueRow[]>()
  for (const row of rows) {
    const list = map.get(row.option_id) ?? []
    list.push(row)
    map.set(row.option_id, list)
  }
  return map
}

/** 一次查询挂载多个 product_option 的 values（避免 N 路并行查库） */
export async function attachOptionValues<T extends OptionRow>(
  db: Db,
  options: T[],
): Promise<Array<T & { values: ValueRow[] }>> {
  if (options.length === 0) return []

  const optionIds = options.map((o) => o.id)
  const rows = await db
    .select()
    .from(productOptionValue)
    .where(inArray(productOptionValue.option_id, optionIds))
    .orderBy(asc(productOptionValue.option_id), asc(productOptionValue.created_at))

  const byOption = groupValuesByOptionId(rows)
  return options.map((opt) => ({
    ...opt,
    values: byOption.get(opt.id) ?? [],
  }))
}
