import fs from "node:fs"
import path from "node:path"

const base = "apps/admin/src/routes/draft-orders"

function walk(dir) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name)
    if (name.isDirectory()) walk(p)
    else if (name.name.endsWith(".tsx")) fixFile(p)
  }
}

function fixFile(file) {
  let s = fs.readFileSync(file, "utf8")
  const before = s
  s = s.replaceAll(
    /from "(\.\.\/)+hooks\/common\/use-data-table-date-filters"/g,
    (m) => {
      const depth = (m.match(/\.\.\//g) || []).length
      const prefix = "../".repeat(depth)
      return `from "${prefix}components/data-table/helpers/general/use-data-table-date-filters"`
    },
  )
  s = s.replaceAll(
    /from "(\.\.\/)+hooks\/common\/use-query-params"/g,
    (m) => {
      const depth = (m.match(/\.\.\//g) || []).length
      const prefix = "../".repeat(depth)
      return `from "${prefix}hooks/use-query-params"`
    },
  )
  s = s.replaceAll(
    /from "(\.\.\/)+hooks\/common\/use-combobox-data"/g,
    (m) => {
      const depth = (m.match(/\.\.\//g) || []).length
      const prefix = "../".repeat(depth)
      return `from "${prefix}hooks/use-combobox-data"`
    },
  )
  s = s.replaceAll(
    /from "(\.\.\/)+hooks\/common\/use-debounced-search"/g,
    (m) => {
      const depth = (m.match(/\.\.\//g) || []).length
      const prefix = "../".repeat(depth)
      return `from "${prefix}hooks/use-debounced-search"`
    },
  )
  if (s !== before) {
    fs.writeFileSync(file, s)
    console.log("fixed", file)
  }
}

walk(base)
