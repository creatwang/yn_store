import fs from "node:fs"
import path from "node:path"

const root = path.join(process.cwd(), "src")
const exts = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  "/index.ts",
  "/index.tsx",
]

function exists(base) {
  for (const e of exts) {
    const f = base + e
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f
  }
  return null
}

function walk(dir, out = []) {
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n)
    if (fs.statSync(p).isDirectory()) walk(p, out)
    else if (/\.(tsx?|jsx?)$/.test(n)) out.push(p)
  }
  return out
}

const relRe = /from\s+["'](\.[^"']+)["']/g
const broken = []

for (const file of walk(root)) {
  const txt = fs.readFileSync(file, "utf8")
  let m
  while ((m = relRe.exec(txt))) {
    const spec = m[1]
    const base = path.resolve(path.dirname(file), spec)
    if (!exists(base)) {
      broken.push({
        file: path.relative(root, file).replace(/\\/g, "/"),
        import: spec,
      })
    }
  }
}

for (const b of broken) {
  console.log(`${b.file} -> ${b.import}`)
}
console.error(`total ${broken.length}`)
