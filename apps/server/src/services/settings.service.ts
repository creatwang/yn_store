import { and, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm"
import { generateId, getDb, productTag, productType, taxRegion, returnReason, refundReason } from "@my-store/db"
import type {
  ListProductTagsQuery, CreateProductTagInput, UpdateProductTagInput,
  ListProductTypesQuery, CreateProductTypeInput, UpdateProductTypeInput,
  ListTaxRegionsQuery, CreateTaxRegionInput, UpdateTaxRegionInput,
  ListReturnReasonsQuery, CreateReturnReasonInput, UpdateReturnReasonInput,
  ListRefundReasonsQuery, CreateRefundReasonInput, UpdateRefundReasonInput,
} from "@my-store/validators"
import { HTTPException } from "hono/http-exception"

// 通用 CRUD 工厂
function makeListFn(table: any, entityKey: string) {
  return async (query: { limit: number; offset: number; q?: string; order?: string }) => {
    const db = getDb()
    const conditions = [isNull(table.deleted_at)]

    if (query.q && table.value) {
      conditions.push(ilike(table.value, `%${query.q}%`)!)
    } else if (query.q && table.label) {
      conditions.push(ilike(table.label, `%${query.q}%`)!)
    }

    const where = and(...conditions)
    const orderBy = desc(table.created_at)

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(table).where(where).orderBy(orderBy).limit(query.limit).offset(query.offset),
      db.select({ total: count() }).from(table).where(where),
    ])

    return { [entityKey]: rows, count: Number(total), limit: query.limit, offset: query.offset }
  }
}

function makeGetByIdFn(table: any, entityKey: string) {
  return async (id: string) => {
    const db = getDb()
    const [item] = await db.select().from(table).where(and(eq(table.id, id), isNull(table.deleted_at))).limit(1)
    if (!item) throw new HTTPException(404, { message: "未找到" })
    return { [entityKey.slice(0, -1)]: item }
  }
}

function makeCreateFn(table: any, prefix: string, entityKey: string) {
  return async (input: any) => {
    const db = getDb()
    const id = generateId(prefix)
    const [created] = await db.insert(table).values({ id, ...input, created_at: sql`now()`, updated_at: sql`now()` }).returning()
    return { [entityKey.slice(0, -1)]: created }
  }
}

function makeUpdateFn(table: any, entityKey: string) {
  return async (id: string, input: any) => {
    const db = getDb()
    const [updated] = await db.update(table).set({ ...input, updated_at: sql`now()` }).where(and(eq(table.id, id), isNull(table.deleted_at))).returning()
    if (!updated) throw new HTTPException(404, { message: "未找到" })
    return { [entityKey.slice(0, -1)]: updated }
  }
}

function makeDeleteFn(table: any) {
  return async (id: string) => {
    const db = getDb()
    await db.update(table).set({ deleted_at: sql`now()`, updated_at: sql`now()` }).where(and(eq(table.id, id), isNull(table.deleted_at)))
    return { id, deleted: true }
  }
}

// ── Product Tags ──────────────────────────────────────────────
export const productTagService = {
  list: makeListFn(productTag, "product_tags"),
  getById: makeGetByIdFn(productTag, "product_tags"),
  create: makeCreateFn(productTag, "ptag", "product_tags"),
  update: makeUpdateFn(productTag, "product_tags"),
  delete: makeDeleteFn(productTag),
}

// ── Product Types ─────────────────────────────────────────────
export const productTypeService = {
  list: makeListFn(productType, "product_types"),
  getById: makeGetByIdFn(productType, "product_types"),
  create: makeCreateFn(productType, "ptyp", "product_types"),
  update: makeUpdateFn(productType, "product_types"),
  delete: makeDeleteFn(productType),
}

// ── Tax Regions ───────────────────────────────────────────────
export const taxRegionService = {
  list: makeListFn(taxRegion, "tax_regions"),
  getById: makeGetByIdFn(taxRegion, "tax_regions"),
  create: makeCreateFn(taxRegion, "txreg", "tax_regions"),
  update: makeUpdateFn(taxRegion, "tax_regions"),
  delete: makeDeleteFn(taxRegion),
}

// ── Return Reasons ────────────────────────────────────────────
export const returnReasonService = {
  list: makeListFn(returnReason, "return_reasons"),
  getById: makeGetByIdFn(returnReason, "return_reasons"),
  create: makeCreateFn(returnReason, "rr", "return_reasons"),
  update: makeUpdateFn(returnReason, "return_reasons"),
  delete: makeDeleteFn(returnReason),
}

// ── Refund Reasons ────────────────────────────────────────────
export const refundReasonService = {
  list: makeListFn(refundReason, "refund_reasons"),
  getById: makeGetByIdFn(refundReason, "refund_reasons"),
  create: makeCreateFn(refundReason, "rfnd", "refund_reasons"),
  update: makeUpdateFn(refundReason, "refund_reasons"),
  delete: makeDeleteFn(refundReason),
}
