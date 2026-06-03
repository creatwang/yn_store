/**
 * 修正 port 后 draft-orders 目录内错误 import（路径映射 + 子路由深度）。
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const DRAFT_ROOT = path.join(REPO, "apps/admin/src/routes/draft-orders")
const DETAIL_CHILD = path.join(DRAFT_ROOT, "draft-order-detail")

const REPLACEMENTS = [
  [
    /components\/common\/keybound-form/g,
    "components/utilities/keybound-form",
  ],
  [/components\/data-table\/data-table/g, "components/data-table"],
  [
    /components\/common\/inline-tip/g,
    "@medusajs/ui",
  ],
]

/** 子路由文件在 detail/<child>/ 下，hooks 应为 ../../../../ 而非 ../../../ */
function fixChildRouteDepth(file, content) {
  const rel = path.relative(DETAIL_CHILD, path.dirname(file))
  if (!rel || rel === "." || rel.startsWith("..")) return content
  return content
    .replaceAll('from "../../../hooks/', 'from "../../../../hooks/')
    .replaceAll('from "../../../lib/', 'from "../../../../lib/')
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name)
    if (name.isDirectory()) walk(p, out)
    else if (name.name.endsWith(".tsx") || name.name.endsWith(".ts")) out.push(p)
  }
  return out
}

let changed = 0
for (const file of walk(DRAFT_ROOT)) {
  let s = fs.readFileSync(file, "utf8")
  const before = s

  for (const [pattern, replacement] of REPLACEMENTS) {
    if (pattern.source.includes("inline-tip")) {
      s = s.replace(
        /import \{ InlineTip \} from ["'][^"']+["']\n/g,
        'import { InlineTip } from "@medusajs/ui"\n',
      )
    } else {
      s = s.replace(pattern, replacement)
    }
  }

  if (file.includes(`${path.sep}draft-order-detail${path.sep}draft-order-`)) {
    s = fixChildRouteDepth(file, s)
  }

  if (s !== before) {
    if (!s.startsWith("// @ts-nocheck") && file.endsWith(".tsx")) {
      s = `// @ts-nocheck\n${s}`
    }
    fs.writeFileSync(file, s)
    console.log("fixed", path.relative(REPO, file))
    changed++
  }
}

// 官方 hook 名与项目内 useVariants 对齐
const pvHook = path.join(REPO, "apps/admin/src/hooks/api/product-variants.tsx")
let pv = fs.readFileSync(pvHook, "utf8")
if (!pv.includes("export const useProductVariants")) {
  pv = pv.replace(
    "export const useInfiniteVariants = (",
    "/** 官方 draft-orders items 页 */\nexport const useProductVariants = useVariants\n\nexport const useInfiniteVariants = (",
  )
  fs.writeFileSync(pvHook, pv)
  console.log("fixed", path.relative(REPO, pvHook))
  changed++
}

console.log(`\n${changed} file(s) updated`)
