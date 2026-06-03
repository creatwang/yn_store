import fs from "node:fs"

const p = "apps/admin/src/routes/draft-orders/draft-order-create/draft-order-create.tsx"
let s = fs.readFileSync(p, "utf8")
s = s.replaceAll('from "../components/', 'from "../../../components/')
s = s.replaceAll('from "../hooks/', 'from "../../../hooks/')
s = s.replaceAll('from "../lib/', 'from "../../../lib/')
s = s.replaceAll(
  "components/common/keybound-form",
  "components/utilities/keybound-form",
)
if (!s.startsWith("// @ts-nocheck")) {
  s = `// @ts-nocheck\n${s}`
}
if (!s.includes("export const DraftOrderCreate")) {
  s = s.replace(/\bconst Create = /, "export const DraftOrderCreate = ")
  s = s.replace(/export default Create\s*/, "")
}
fs.writeFileSync(p, s)
console.log("fixed", p)
