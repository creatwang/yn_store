import { and, eq, inArray, isNull } from "drizzle-orm"
import { getDb, translation } from "@my-store/db"

type RecordLike = Record<string, unknown>

/**
 * 将 translation 表中的字段 overlay 到业务记录上（Store API locale 语义）。
 */
export async function applyTranslations<T extends RecordLike>(
  reference: string,
  records: T[],
  locale: string | undefined,
  idField = "id",
): Promise<T[]> {
  if (!locale || records.length === 0) {
    return records
  }

  const ids = records
    .map((r) => r[idField])
    .filter((id): id is string => typeof id === "string")

  if (!ids.length) {
    return records
  }

  const db = getDb()
  const rows = await db
    .select()
    .from(translation)
    .where(
      and(
        eq(translation.reference, reference),
        eq(translation.locale_code, locale),
        inArray(translation.reference_id, ids),
        isNull(translation.deleted_at),
      ),
    )

  if (!rows.length) {
    return records
  }

  const byRefId = new Map(rows.map((r) => [r.reference_id, r.translations ?? {}]))

  return records.map((record) => {
    const id = record[idField]
    if (typeof id !== "string") {
      return record
    }
    const patch = byRefId.get(id)
    if (!patch) {
      return record
    }
    const next: Record<string, unknown> = { ...record }
    for (const [field, value] of Object.entries(patch)) {
      if (typeof value === "string" && value.trim()) {
        next[field] = value
      }
    }
    return next as T
  })
}

export async function applyTranslation<T extends RecordLike>(
  reference: string,
  record: T,
  locale: string | undefined,
  idField = "id",
): Promise<T> {
  const [result] = await applyTranslations(reference, [record], locale, idField)
  return result ?? record
}
