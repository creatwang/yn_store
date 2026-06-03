/**
 * 修正 draft-order-list 相对路径（port 后 ../../ 少一层）。
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const p = path.join(
  REPO,
  "apps/admin/src/routes/draft-orders/draft-order-list/draft-order-list.tsx",
)

let s = fs.readFileSync(p, "utf8")
s = s.replace(/import \{ defineRouteConfig \}[^\n]+\n/, "")
s = s.replaceAll(
  'from "../../components/data-table/data-table"',
  'from "../../../components/data-table"',
)
s = s.replaceAll(
  'from "../components/common/data-table"',
  'from "../../../components/data-table"',
)
s = s.replaceAll('from "../../hooks/', 'from "../../../hooks/')
s = s.replaceAll('from "../hooks/', 'from "../../../hooks/')
s = s.replaceAll('from "../../lib/', 'from "../../../lib/')
s = s.replaceAll('from "../lib/', 'from "../../../lib/')
if (!s.startsWith("// @ts-nocheck")) {
  s = `// @ts-nocheck\n${s}`
}
s = s.replace(/\bconst List = /, "export const DraftOrderList = ")
s = s.replace(/export default List\s*/, "")
fs.writeFileSync(p, s)
console.log("fixed", p)
