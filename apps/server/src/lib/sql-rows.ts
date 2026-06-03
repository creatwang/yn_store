/** postgres-js / drizzle execute 结果统一为行数组 */
export function sqlRows<T = Record<string, unknown>>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[]
  const rows = (result as { rows?: T[] })?.rows
  return rows ?? []
}
