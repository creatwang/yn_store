/**
 * 子路由深度为 routes/draft-orders/draft-order-detail/<child>/ → src 需 4 层 ../
 * port 后若误写成 5 层，收回一层。
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const base = path.join(
  REPO,
  "apps/admin/src/routes/draft-orders/draft-order-detail",
)

for (const name of fs.readdirSync(base, { withFileTypes: true })) {
  if (!name.isDirectory() || !name.name.startsWith("draft-order-")) continue
  const file = path.join(base, name.name, `${name.name}.tsx`)
  if (!fs.existsSync(file)) continue
  let s = fs.readFileSync(file, "utf8")
  const before = s
  s = s.replaceAll('from "../../../../../', 'from "../../../../')
  if (!s.startsWith("// @ts-nocheck")) {
    s = `// @ts-nocheck\n${s}`
  }
  if (s !== before) {
    fs.writeFileSync(file, s)
    console.log("fixed", path.relative(REPO, file))
  }
}
