/**
 * Reorganize scattered lib ts files into feature folders and update imports.
 * Usage: node scripts/reorganize-lib.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

/** @type {Record<string, string>} oldPathSuffix -> newPathSuffix (相对 lib/) */
const serverMoves = {
  "query-filters.ts": "infra/query/query-filters.ts",
  "normalize-query.ts": "infra/query/normalize-query.ts",
  "rpc-query-validator.ts": "infra/query/rpc-query-validator.ts",
  "check-db.ts": "infra/db/check-db.ts",
  "log-db-pool.ts": "infra/db/log-db-pool.ts",
  "log-startup.ts": "infra/db/log-startup.ts",
  "transaction.ts": "infra/db/transaction.ts",
  "sql-in-ids.ts": "infra/sql/sql-in-ids.ts",
  "sql-rows.ts": "infra/sql/sql-rows.ts",
  "events.ts": "infra/events/events.ts",
  "event-subscribers.ts": "infra/events/event-subscribers.ts",
  "workflow.ts": "infra/workflow/workflow.ts",
  "rollback.ts": "infra/rollback/rollback.ts",
  "jwt.ts": "auth/jwt.ts",
  "password-hash.ts": "auth/password-hash.ts",
  "mail.ts": "mail/mail.ts",
  "notify-customer.ts": "mail/notify-customer.ts",
  "notification-feed.ts": "notification/notification-feed.ts",
  "notification-resend.ts": "notification/notification-resend.ts",
  "order-change-actions-batch.ts": "order/order-change-actions-batch.ts",
  "order-change-items.ts": "order/order-change-items.ts",
  "order-change-shipping.ts": "order/order-change-shipping.ts",
  "order-notification-context.ts": "order/order-notification-context.ts",
  "order-summary.ts": "order/order-summary.ts",
  "shipping-option-enrich-batch.ts": "shipping/shipping-option-enrich-batch.ts",
  "shipping-option-list-filter.ts": "shipping/shipping-option-list-filter.ts",
  "product-option-values-batch.ts": "product/product-option-values-batch.ts",
  "slug.ts": "product/slug.ts",
  "region-country-catalog.ts": "region/region-country-catalog.ts",
  "region-country-sync.ts": "region/region-country-sync.ts",
  "promotion-rule-options.ts": "promotion/promotion-rule-options.ts",
  "ensure-payment-providers.ts": "payment/ensure-payment-providers.ts",
  "inventory-external-hook.ts": "inventory/inventory-external-hook.ts",
  "csv.ts": "csv/csv.ts",
  "big-number.ts": "math/big-number.ts",
}

const storefrontMoves = {
  "auth.ts": "auth/index.ts",
  "cart.ts": "cart/index.ts",
  "catalog.ts": "catalog/index.ts",
  "store-api.ts": "api/index.ts",
  "images.ts": "media/images.ts",
}

const adminMoves = {
  "api.ts": "api/api.ts",
  "client.ts": "api/client.ts",
  "auth-storage.ts": "auth/auth-storage.ts",
  "query-client.ts": "query/query-client.ts",
  "query-key-factory.ts": "query/query-key-factory.ts",
  "orders.ts": "orders/orders.ts",
  "order-helpers.ts": "orders/order-helpers.ts",
  "order-item.ts": "orders/order-item.ts",
  "rma.ts": "orders/rma.ts",
  "rma-inventory.ts": "orders/rma-inventory.ts",
  "credit-line.ts": "orders/credit-line.ts",
  "money-amount-helpers.ts": "money/money-amount-helpers.ts",
  "format-currency.ts": "money/format-currency.ts",
  "percentage-helpers.ts": "money/percentage-helpers.ts",
  "number-helper.ts": "money/number-helper.ts",
  "cast-number.ts": "money/cast-number.ts",
  "shipping-options.ts": "shipping/shipping-options.ts",
  "format-provider.ts": "shipping/format-provider.ts",
  "payment.ts": "payment/payment.ts",
  "promotions.ts": "promotions/promotions.ts",
  "lazy-route.ts": "routing/lazy-route.ts",
  "storefront.ts": "storefront/storefront.ts",
  "form-helpers.ts": "forms/form-helpers.ts",
  "validation.ts": "forms/validation.ts",
  "schemas.ts": "forms/schemas.ts",
  "common.ts": "common/common.ts",
  "addresses.ts": "addresses/addresses.ts",
  "date-iso.ts": "date/date-iso.ts",
  "plugins.ts": "plugins/plugins.ts",
  "is-fetch-error.ts": "error/is-fetch-error.ts",
  "table-display-utils.tsx": "display/table-display-utils.tsx",
  "format-file-size.ts": "display/format-file-size.ts",
}

function moveFile(libDir, moves) {
  for (const [from, to] of Object.entries(moves)) {
    const src = path.join(libDir, from)
    const dest = path.join(libDir, to)
    if (!fs.existsSync(src)) {
      console.warn(`skip missing: ${src}`)
      continue
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.renameSync(src, dest)
    console.log(`moved ${path.relative(root, src)} -> ${path.relative(root, dest)}`)
  }
}

function buildReplacements(moves, libPrefix) {
  /** @type {Array<[RegExp, string]>} */
  const rules = []
  for (const [from, to] of Object.entries(moves)) {
    const fromBase = from.replace(/\.tsx?$/, "")
    const toBase = to.replace(/\/index\.tsx?$/, "").replace(/\.tsx?$/, "")
    const fromDir = path.dirname(fromBase)
    const toDir = path.dirname(toBase)
    const fromName = path.basename(fromBase)
    const toName = path.basename(toBase)

    // lib/query-filters -> lib/infra/query/query-filters
    rules.push([
      new RegExp(`${libPrefix}/${fromBase.replace(/\./g, "\\.")}(?=['"])`, "g"),
      `${libPrefix}/${to.replace(/\.tsx?$/, "")}`,
    ])
    // lib/query-filters without extension in some paths
    if (fromDir === ".") {
      rules.push([
        new RegExp(`${libPrefix}/${fromName}(?=['"])`, "g"),
        `${libPrefix}/${toDir === "." ? toName : toDir}`,
      ])
    }
  }
  return rules
}

function fixInternalImports(filePath, libDir, moves) {
  let content = fs.readFileSync(filePath, "utf8")
  let changed = false
  const fileDir = path.dirname(filePath)

  for (const [from, to] of Object.entries(moves)) {
    const fromBase = from.replace(/\.tsx?$/, "")
    const toPath = to.replace(/\.tsx?$/, "")
    const fromFile = path.join(libDir, from)
    if (!fs.existsSync(path.join(libDir, toPath + path.extname(from)) && !to.endsWith("index.ts"))) {
      // noop
    }
    const newAbs = path.join(libDir, toPath.includes(".") ? toPath : to)
    const newTarget = newAbs.endsWith(".ts") || newAbs.endsWith(".tsx") ? newAbs : newAbs + ".ts"
    const actualNew = fs.existsSync(path.join(libDir, to)) ? path.join(libDir, to) : newTarget

    // ./foo from same old directory
    const oldSameDir = `./${fromBase.replace(/^.*\//, "")}`
    const rel = path.relative(fileDir, actualNew).replace(/\\/g, "/").replace(/\.tsx?$/, "")
    const relImport = rel.startsWith(".") ? rel : `./${rel}`

    if (content.includes(`from "${oldSameDir}"`) || content.includes(`from '${oldSameDir}'`)) {
      content = content.replaceAll(`from "${oldSameDir}"`, `from "${relImport}"`)
      content = content.replaceAll(`from '${oldSameDir}'`, `from '${relImport}'`)
      changed = true
    }
  }

  // providers moved to payment/providers
  if (filePath.includes(`${path.sep}inventory${path.sep}`)) {
    const relProviders = path.relative(fileDir, path.join(libDir, "payment/providers")).replace(/\\/g, "/")
    if (content.includes('from "./providers"')) {
      content = content.replaceAll('from "./providers"', `from "${relProviders}"`)
      changed = true
    }
  }

  if (changed) fs.writeFileSync(filePath, content)
}

function walk(dir, fn) {
  if (!fs.existsSync(dir)) return
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".git") continue
      walk(p, fn)
    } else if (/\.(ts|tsx|astro|mts|js|mjs)$/.test(ent.name)) {
      fn(p)
    }
  }
}

function applyReplacements(content, rules) {
  let out = content
  for (const [re, rep] of rules) {
    out = out.replace(re, rep)
  }
  return out
}

function createBarrel(dir, exportFiles) {
  const lines = exportFiles.map((f) => {
    const base = f.replace(/\.tsx?$/, "").replace(/^\.\//, "")
    return `export * from "./${base}"`
  })
  fs.writeFileSync(path.join(dir, "index.ts"), `${lines.join("\n")}\n`)
}

function main() {
  const serverLib = path.join(root, "apps/server/src/lib")
  const storefrontLib = path.join(root, "apps/storefront/src/lib")
  const adminLib = path.join(root, "apps/admin/src/lib")

  // Move providers under payment/
  const providersSrc = path.join(serverLib, "providers")
  const providersDest = path.join(serverLib, "payment/providers")
  if (fs.existsSync(providersSrc) && !fs.existsSync(providersDest)) {
    fs.mkdirSync(path.join(serverLib, "payment"), { recursive: true })
    fs.renameSync(providersSrc, providersDest)
    console.log("moved providers -> payment/providers")
  }

  moveFile(serverLib, serverMoves)
  moveFile(storefrontLib, storefrontMoves)
  moveFile(adminLib, adminMoves)

  // Remove duplicate admin client/ folder if empty-ish (keep if has content)
  const adminClientDir = path.join(adminLib, "client")
  if (fs.existsSync(adminClientDir)) {
    fs.rmSync(adminClientDir, { recursive: true, force: true })
    console.log("removed admin lib/client/ duplicate folder")
  }

  // Server barrels
  createBarrel(path.join(serverLib, "infra/query"), ["query-filters", "normalize-query", "rpc-query-validator"])
  createBarrel(path.join(serverLib, "infra/db"), ["check-db", "log-db-pool", "log-startup", "transaction"])
  createBarrel(path.join(serverLib, "infra/sql"), ["sql-in-ids", "sql-rows"])
  createBarrel(path.join(serverLib, "infra/events"), ["events", "event-subscribers"])
  createBarrel(path.join(serverLib, "infra/workflow"), ["workflow"])
  createBarrel(path.join(serverLib, "infra/rollback"), ["rollback"])
  createBarrel(path.join(serverLib, "infra"), [
    "./query/index",
    "./db/index",
    "./sql/index",
    "./events/index",
    "./workflow/index",
    "./rollback/index",
  ].map((s) => s.replace("./", "").replace("/index", "")))
  // fix infra index - use subfolder exports
  fs.writeFileSync(
    path.join(serverLib, "infra/index.ts"),
    `export * from "./query/index"
export * from "./db/index"
export * from "./sql/index"
export * from "./events/index"
export * from "./workflow/index"
export * from "./rollback/index"
`,
  )

  for (const sub of ["auth", "mail", "notification", "order", "shipping", "product", "region", "promotion", "payment", "inventory", "csv", "math"]) {
    const d = path.join(serverLib, sub)
    if (!fs.existsSync(d)) continue
    const files = fs.readdirSync(d).filter((f) => /^[^.]+\.(ts|tsx)$/.test(f) && f !== "index.ts")
    if (files.length) {
      createBarrel(
        d,
        files.map((f) => f.replace(/\.tsx?$/, "")),
      )
    }
  }

  // payment/providers index stays

  // Storefront barrels
  createBarrel(path.join(storefrontLib, "media"), ["images"])
  // auth, cart, catalog, api already index.ts from move

  // Admin barrels
  createBarrel(path.join(adminLib, "api"), ["api", "client"])
  for (const sub of [
    "auth",
    "query",
    "orders",
    "money",
    "shipping",
    "payment",
    "promotions",
    "routing",
    "storefront",
    "forms",
    "common",
    "addresses",
    "date",
    "plugins",
    "error",
    "display",
  ]) {
    const d = path.join(adminLib, sub)
    if (!fs.existsSync(d)) continue
    const files = fs.readdirSync(d).filter((f) => /^[^.]+\.(ts|tsx)$/.test(f) && f !== "index.ts")
    if (files.length) {
      createBarrel(
        d,
        files.map((f) => f.replace(/\.tsx?$/, "")),
      )
    }
  }

  // Fix admin api/client internal import
  const adminClient = path.join(adminLib, "api/client.ts")
  if (fs.existsSync(adminClient)) {
    let c = fs.readFileSync(adminClient, "utf8")
    c = c.replace('from "./api"', 'from "./api"')
    fs.writeFileSync(adminClient, c)
  }

  const serverRules = buildReplacements(serverMoves, "lib")
  serverRules.push([/lib\/providers/g, "lib/payment/providers"])

  const storefrontRules = buildReplacements(storefrontMoves, "lib")
  // i18n catalog-resolver parent imports
  storefrontRules.push([/from "\.\.\/catalog"/g, 'from "../catalog/index"'])
  storefrontRules.push([/from "\.\.\/store-api"/g, 'from "../api"'])
  storefrontRules.push([/from "\.\.\/\.\.\/catalog"/g, 'from "../../catalog"'])

  const adminRules = buildReplacements(adminMoves, "lib")

  const scanRoots = [
    path.join(root, "apps/server"),
    path.join(root, "apps/storefront"),
    path.join(root, "apps/admin/src"),
  ]

  for (const scanRoot of scanRoots) {
    walk(scanRoot, (filePath) => {
      let content = fs.readFileSync(filePath, "utf8")
      const orig = content

      if (filePath.includes(`${path.sep}apps${path.sep}server${path.sep}`)) {
        content = applyReplacements(content, serverRules)
        content = content.replace(/from "\.\/providers"/g, 'from "./payment/providers"')
        content = content.replace(/from "\.\.\/providers"/g, 'from "../payment/providers"')
        content = content.replace(/from "\.\.\/\.\.\/providers"/g, 'from "../../payment/providers"')
      }
      if (filePath.includes(`${path.sep}apps${path.sep}storefront${path.sep}`)) {
        content = applyReplacements(content, storefrontRules)
        content = content.replace(/from "\.\/lib\/store-api"/g, 'from "./lib/api"')
        content = content.replace(/from "\.\.\/lib\/store-api"/g, 'from "../lib/api"')
        content = content.replace(/from "\.\.\/\.\.\/lib\/store-api"/g, 'from "../../lib/api"')
        content = content.replace(/from "\.\.\/\.\.\/\.\.\/lib\/store-api"/g, 'from "../../../lib/api"')
        content = content.replace(/from "\.\.\/lib\/auth"/g, 'from "../lib/auth"')
        content = content.replace(/from "\.\.\/lib\/cart"/g, 'from "../lib/cart"')
        content = content.replace(/from "\.\.\/lib\/images"/g, 'from "../lib/media/images"')
        content = content.replace(/from "\.\.\/\.\.\/lib\/images"/g, 'from "../../lib/media/images"')
        content = content.replace(/from "\.\.\/\.\.\/\.\.\/lib\/images"/g, 'from "../../../lib/media/images"')
      }
      if (filePath.includes(`${path.sep}apps${path.sep}admin${path.sep}`)) {
        content = applyReplacements(content, adminRules)
        content = content.replace(/@\/lib\/client(?=['"])/g, "@/lib/api/client")
        content = content.replace(/@\/lib\/api(?=['"])/g, "@/lib/api/api")
        // simplify to barrel where file moved to folder/index
        for (const [from, to] of Object.entries(adminMoves)) {
          const folder = to.split("/")[0]
          const fromBase = from.replace(/\.tsx?$/, "")
          if (fromBase.includes("/")) continue
          content = content.replace(new RegExp(`@/lib/${fromBase}(?=['"])`, "g"), `@/lib/${folder}`)
          content = content.replace(new RegExp(`lib/${fromBase}(?=['"])`, "g"), `lib/${folder}`)
        }
      }

      if (content !== orig) {
        fs.writeFileSync(filePath, content)
        console.log(`updated imports: ${path.relative(root, filePath)}`)
      }
    })
  }

  // Fix internal lib cross-imports after move
  walk(serverLib, (fp) => fixInternalImports(fp, serverLib, serverMoves))
  fixInternalImports(path.join(serverLib, "payment/providers/index.ts"), serverLib, serverMoves)
  fixInternalImports(path.join(serverLib, "infra/workflow/workflow.ts"), serverLib, serverMoves)

  // workflow providers path
  const workflowFile = path.join(serverLib, "infra/workflow/workflow.ts")
  if (fs.existsSync(workflowFile)) {
    let w = fs.readFileSync(workflowFile, "utf8")
    w = w.replace('from "./providers/types"', 'from "../../payment/providers/types"')
    fs.writeFileSync(workflowFile, w)
  }

  const invHook = path.join(serverLib, "inventory/inventory-external-hook.ts")
  if (fs.existsSync(invHook)) {
    let c = fs.readFileSync(invHook, "utf8")
    c = c.replace('from "./providers"', 'from "../payment/providers"')
    fs.writeFileSync(invHook, c)
  }

  // i18n catalog-resolver
  const resolver = path.join(storefrontLib, "i18n/catalog-resolver.ts")
  if (fs.existsSync(resolver)) {
    let c = fs.readFileSync(resolver, "utf8")
    c = c.replace('from "../catalog"', 'from "../catalog/index"')
    c = c.replace('from "../store-api"', 'from "../api"')
    fs.writeFileSync(resolver, c)
  }

  console.log("done")
}

main()
