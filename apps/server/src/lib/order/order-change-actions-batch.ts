import { asc, inArray } from "drizzle-orm"
import { orderChangeAction } from "@my-store/db"
import type { getDb } from "@my-store/db"

type Db = ReturnType<typeof getDb>
type ActionRow = typeof orderChangeAction.$inferSelect

/** 一次查询加载多条 order_change 的 actions，避免 N 路 Promise.all 打满连接池 */
export async function loadActionsGroupedByChangeId(
  db: Db,
  changeIds: string[],
): Promise<Map<string, ActionRow[]>> {
  const map = new Map<string, ActionRow[]>()
  if (changeIds.length === 0) return map

  const rows = await db
    .select()
    .from(orderChangeAction)
    .where(inArray(orderChangeAction.order_change_id, changeIds))
    .orderBy(asc(orderChangeAction.ordering), asc(orderChangeAction.created_at))

  for (const row of rows) {
    const changeId = row.order_change_id
    if (!changeId) continue
    const list = map.get(changeId) ?? []
    list.push(row)
    map.set(changeId, list)
  }
  return map
}
