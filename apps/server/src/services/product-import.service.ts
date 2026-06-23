import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { and, eq, inArray, isNull, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  product,
  productVariant,
  price,
  priceSet,
  productVariantPriceSet,
} from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import { parseCsv, rowsToObjects, toCsv } from "../lib/csv/csv"
import { slugify } from "../lib/product/slug"
import { runInTransaction, type DbTx } from "../lib/infra/db/transaction"
import { notificationService } from "./notification.service"

const IMPORT_DIR = path.resolve(process.cwd(), "public/imports")
const EXPORT_DIR = path.resolve(process.cwd(), "public/exports")

const EXPORT_HEADERS = [
  "Product Id",
  "Product Handle",
  "Product Title",
  "Product Subtitle",
  "Product Description",
  "Product Status",
  "Product Thumbnail",
  "Variant Id",
  "Variant Title",
  "Variant SKU",
  "Variant Allow Backorder",
  "Variant Manage Inventory",
  "Variant Price USD",
]

type ImportRow = Record<string, string>

type StoredImport = {
  rows: ImportRow[]
  summary: { toCreate: number; toUpdate: number }
}

async function ensureDir(dir: string) {
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
}

function groupImportRows(rows: ImportRow[]) {
  const groups = new Map<string, ImportRow[]>()
  for (const row of rows) {
    const key =
      row["Product Id"] ||
      row["Product Handle"] ||
      row["Product Title"] ||
      `row_${groups.size}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }
  return groups
}

async function summarize(rows: ImportRow[]) {
  const db = getDb()
  let toCreate = 0
  let toUpdate = 0

  for (const [, group] of groupImportRows(rows)) {
    const first = group[0]
    const productId = first["Product Id"]
    const handle = first["Product Handle"]

    let existing = null
    if (productId) {
      ;[existing] = await db
        .select({ id: product.id })
        .from(product)
        .where(and(eq(product.id, productId), isNull(product.deleted_at)))
        .limit(1)
    } else if (handle) {
      ;[existing] = await db
        .select({ id: product.id })
        .from(product)
        .where(and(eq(product.handle, handle), isNull(product.deleted_at)))
        .limit(1)
    }

    if (existing) toUpdate++
    else toCreate++
  }

  return { toCreate, toUpdate }
}

async function upsertVariantPrice(
  db: DbTx,
  variantId: string,
  currency: string,
  amount: number,
) {
  if (!amount || amount <= 0) return

  const [link] = await db
    .select()
    .from(productVariantPriceSet)
    .where(eq(productVariantPriceSet.variant_id, variantId))
    .limit(1)

  let priceSetId = link?.price_set_id
  if (!priceSetId) {
    priceSetId = generateId("pset")
    await db.insert(priceSet).values({ id: priceSetId })
    await db.insert(productVariantPriceSet).values({
      id: generateId("pvps"),
      variant_id: variantId,
      price_set_id: priceSetId,
    })
  }

  const [existing] = await db
    .select()
    .from(price)
    .where(
      and(
        eq(price.price_set_id, priceSetId),
        eq(price.currency_code, currency),
        isNull(price.deleted_at),
      ),
    )
    .limit(1)

  if (existing) {
    await db
      .update(price)
      .set({
        amount: String(amount),
        raw_amount: { amount, precision: 2 },
        updated_at: sql`now()`,
      })
      .where(eq(price.id, existing.id))
  } else {
    await db.insert(price).values({
      id: generateId("price"),
      currency_code: currency,
      amount: String(amount),
      raw_amount: { amount, precision: 2 },
      price_set_id: priceSetId,
      created_at: sql`now()`,
      updated_at: sql`now()`,
    })
  }
}

export const productImportService = {
  async prepareFromCsv(csvText: string) {
    const parsed = rowsToObjects(parseCsv(csvText))
    if (parsed.length === 0) {
      throw new HTTPException(400, { message: "CSV 无有效数据行" })
    }

    const summary = await summarize(parsed)
    const transactionId = generateId("pimp")
    await ensureDir(IMPORT_DIR)

    const stored: StoredImport = { rows: parsed, summary }
    await writeFile(
      path.join(IMPORT_DIR, `${transactionId}.json`),
      JSON.stringify(stored),
      "utf-8",
    )

    return { transaction_id: transactionId, summary }
  },

  async confirm(
    transactionId: string,
    options?: { receiver_id?: string },
  ) {
    const filePath = path.join(IMPORT_DIR, `${transactionId}.json`)
    if (!existsSync(filePath)) {
      throw new HTTPException(404, { message: "导入事务不存在或已过期" })
    }

    const stored = JSON.parse(await readFile(filePath, "utf-8")) as StoredImport

    const result = await runInTransaction(async (db) => {
    const createdProducts: string[] = []
    const updatedProducts: string[] = []

    for (const [, group] of groupImportRows(stored.rows)) {
      const first = group[0]
      const productIdInput = first["Product Id"]
      const handleInput = first["Product Handle"]?.trim()
      const title = first["Product Title"]?.trim() || "Imported Product"

      let productRow = null
      if (productIdInput) {
        ;[productRow] = await db
          .select()
          .from(product)
          .where(and(eq(product.id, productIdInput), isNull(product.deleted_at)))
          .limit(1)
      } else if (handleInput) {
        ;[productRow] = await db
          .select()
          .from(product)
          .where(and(eq(product.handle, handleInput), isNull(product.deleted_at)))
          .limit(1)
      }

      if (productRow) {
        await db
          .update(product)
          .set({
            title: first["Product Title"] || productRow.title,
            subtitle: first["Product Subtitle"] || productRow.subtitle,
            description: first["Product Description"] || productRow.description,
            status: (first["Product Status"] as any) || productRow.status,
            thumbnail: first["Product Thumbnail"] || productRow.thumbnail,
            updated_at: sql`now()`,
          })
          .where(eq(product.id, productRow.id))
        updatedProducts.push(productRow.id)
      } else {
        const id = generateId("prod")
        const handle =
          handleInput || `${slugify(title)}-${generateId("h").slice(0, 6)}`
        ;[productRow] = await db
          .insert(product)
          .values({
            id,
            title,
            handle,
            subtitle: first["Product Subtitle"] || null,
            description: first["Product Description"] || null,
            status: (first["Product Status"] as any) || "draft",
            thumbnail: first["Product Thumbnail"] || null,
            discountable: true,
            is_giftcard: false,
            created_at: sql`now()`,
            updated_at: sql`now()`,
          })
          .returning()
        createdProducts.push(id)
      }

      const pid = productRow!.id

      for (const row of group) {
        const variantIdInput = row["Variant Id"]
        const sku = row["Variant SKU"]?.trim()
        let variantRow = null

        if (variantIdInput) {
          ;[variantRow] = await db
            .select()
            .from(productVariant)
            .where(
              and(
                eq(productVariant.id, variantIdInput),
                eq(productVariant.product_id, pid),
                isNull(productVariant.deleted_at),
              ),
            )
            .limit(1)
        } else if (sku) {
          ;[variantRow] = await db
            .select()
            .from(productVariant)
            .where(
              and(
                eq(productVariant.sku, sku),
                eq(productVariant.product_id, pid),
                isNull(productVariant.deleted_at),
              ),
            )
            .limit(1)
        }

        const variantTitle = row["Variant Title"]?.trim() || "Default"
        const allowBackorder = row["Variant Allow Backorder"]?.toUpperCase() === "TRUE"
        const manageInventory = row["Variant Manage Inventory"]?.toUpperCase() !== "FALSE"

        if (variantRow) {
          await db
            .update(productVariant)
            .set({
              title: variantTitle,
              sku: sku || variantRow.sku,
              allow_backorder: allowBackorder,
              manage_inventory: manageInventory,
              updated_at: sql`now()`,
            })
            .where(eq(productVariant.id, variantRow.id))
        } else {
          const vid = generateId("variant")
          ;[variantRow] = await db
            .insert(productVariant)
            .values({
              id: vid,
              product_id: pid,
              title: variantTitle,
              sku: sku || null,
              allow_backorder: allowBackorder,
              manage_inventory: manageInventory,
              created_at: sql`now()`,
              updated_at: sql`now()`,
            })
            .returning()
        }

        const usd = parseFloat(row["Variant Price USD"] || "0")
        if (variantRow) await upsertVariantPrice(db, variantRow.id, "USD", usd)
      }
    }

    return {
      transaction_id: transactionId,
      created_count: createdProducts.length,
      updated_count: updatedProducts.length,
    }
    })

    await notificationService.sendFeed({
      title: "商品导入完成",
      description: `新建 ${result.created_count} 个、更新 ${result.updated_count} 个商品`,
      receiver_id: options?.receiver_id,
      trigger_type: "product.import.completed",
      resource_id: transactionId,
      resource_type: "product_import",
      idempotency_key: `product-import-feed-${transactionId}`,
    })

    return result
  },
}

export const productExportService = {
  async export(
    query?: { product_ids?: string[]; limit?: number },
    options?: { receiver_id?: string },
  ) {
    const db = getDb()
    const limit = query?.limit ?? 500
    const conditions = [isNull(product.deleted_at)]

    let products = await db
      .select()
      .from(product)
      .where(and(...conditions))
      .limit(limit)

    if (query?.product_ids?.length) {
      products = products.filter((p) => query.product_ids!.includes(p.id))
    }

    const productIds = products.map((p) => p.id)
    const variantsByProduct = new Map<string, (typeof productVariant.$inferSelect)[]>()
    const usdPriceByVariant = new Map<string, string>()

    if (productIds.length > 0) {
      const variants = await db
        .select()
        .from(productVariant)
        .where(
          and(inArray(productVariant.product_id, productIds), isNull(productVariant.deleted_at)),
        )

      for (const v of variants) {
        const list = variantsByProduct.get(v.product_id) ?? []
        list.push(v)
        variantsByProduct.set(v.product_id, list)
      }

      const variantIds = variants.map((v) => v.id)
      if (variantIds.length > 0) {
        const links = await db
          .select()
          .from(productVariantPriceSet)
          .where(inArray(productVariantPriceSet.variant_id, variantIds))

        const priceSetIds = [...new Set(links.map((l) => l.price_set_id))]
        const priceBySetId = new Map<string, string>()

        if (priceSetIds.length > 0) {
          const prices = await db
            .select()
            .from(price)
            .where(
              and(
                inArray(price.price_set_id, priceSetIds),
                eq(price.currency_code, "USD"),
                isNull(price.deleted_at),
              ),
            )

          for (const p of prices) {
            priceBySetId.set(p.price_set_id, String(p.amount))
          }
        }

        for (const link of links) {
          const usd = priceBySetId.get(link.price_set_id)
          if (usd != null) usdPriceByVariant.set(link.variant_id, usd)
        }
      }
    }

    const csvRows: string[][] = []

    for (const p of products) {
      const variants = variantsByProduct.get(p.id) ?? []

      if (variants.length === 0) {
        csvRows.push([
          p.id,
          p.handle,
          p.title,
          p.subtitle ?? "",
          p.description ?? "",
          p.status ?? "",
          p.thumbnail ?? "",
          "",
          "",
          "",
          "",
          "",
          "",
        ])
        continue
      }

      for (const v of variants) {
        csvRows.push([
          p.id,
          p.handle,
          p.title,
          p.subtitle ?? "",
          p.description ?? "",
          p.status ?? "",
          p.thumbnail ?? "",
          v.id,
          v.title ?? "",
          v.sku ?? "",
          String(v.allow_backorder ?? false).toUpperCase(),
          String(v.manage_inventory ?? true).toUpperCase(),
          usdPriceByVariant.get(v.id) ?? "",
        ])
      }
    }

    const csv = toCsv(EXPORT_HEADERS, csvRows)
    const transactionId = generateId("pexp")
    await ensureDir(EXPORT_DIR)
    const filename = `${transactionId}.csv`
    await writeFile(path.join(EXPORT_DIR, filename), csv, "utf-8")

    const downloadUrl = `/api/admin/products/export/${transactionId}`
    const result = {
      transaction_id: transactionId,
      url: downloadUrl,
      count: csvRows.length,
    }

    await notificationService.sendFeed({
      title: "商品导出完成",
      description: `共导出 ${csvRows.length} 行，可下载 CSV`,
      file: {
        filename,
        url: downloadUrl,
        mimeType: "text/csv",
      },
      receiver_id: options?.receiver_id,
      trigger_type: "product.export.completed",
      resource_id: transactionId,
      resource_type: "product_export",
      idempotency_key: `product-export-feed-${transactionId}`,
    })

    return result
  },
}
