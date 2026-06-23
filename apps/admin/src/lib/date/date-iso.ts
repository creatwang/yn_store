/** DatePicker / 表单可能返回 Date、ISO 字符串或带 toDate 的对象 */
export function toIsoStringOrNull(value: unknown): string | null {
  if (value == null || value === "") {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }

  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    const d = (value as { toDate: () => Date }).toDate()
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }

  return null
}
