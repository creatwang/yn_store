/** 简易 CSV 解析（支持引号与逗号） */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (ch === "," && !inQuotes) {
      row.push(cell)
      cell = ""
      continue
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++
      row.push(cell)
      cell = ""
      if (row.some((c) => c.length > 0)) rows.push(row)
      row = []
      continue
    }

    cell += ch
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    if (row.some((c) => c.length > 0)) rows.push(row)
  }

  return rows
}

export function csvEscape(value: string | null | undefined): string {
  const s = value ?? ""
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.map(csvEscape).join(",")]
  for (const row of rows) {
    lines.push(headers.map((_, i) => csvEscape(row[i] ?? "")).join(","))
  }
  return lines.join("\n")
}

export function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return []
  const headers = rows[0].map((h) => h.trim())
  return rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => {
      obj[h] = (cells[i] ?? "").trim()
    })
    return obj
  })
}
