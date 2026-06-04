import { and, count, desc, eq, ilike, inArray, isNull, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  productTag,
  productType,
  taxRegion,
  taxRate,
  returnReason,
  refundReason,
} from "@my-store/db"
import type { AdminGetTaxRegionsParamsType } from "@my-store/validators/admin-list-params"
import { listLimitOffset } from "../lib/query-filters"
import { HTTPException } from "hono/http-exception"

// 通用 CRUD 工厂
function makeListFn(table: any, entityKey: string) {
  return async (query: {
    limit?: number
    offset?: number
    q?: string
    order?: string
  }) => {
    const db = getDb()
    const { limit, offset } = listLimitOffset(query, { limit: 50, offset: 0 })
    const conditions = [isNull(table.deleted_at)]

    if (query.q && table.value) {
      conditions.push(ilike(table.value, `%${query.q}%`)!)
    } else if (query.q && table.label) {
      conditions.push(ilike(table.label, `%${query.q}%`)!)
    }

    const where = and(...conditions)
    const orderBy = desc(table.created_at)

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(table).where(where).orderBy(orderBy).limit(limit).offset(offset),
      db.select({ total: count() }).from(table).where(where),
    ])

    return { [entityKey]: rows, count: Number(total), limit, offset }
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

async function loadTaxRatesByRegionIds(regionIds: string[]) {
  if (!regionIds.length) return new Map<string, (typeof taxRate.$inferSelect)[]>()
  const db = getDb()
  const rows = await db
    .select()
    .from(taxRate)
    .where(
      and(
        inArray(taxRate.tax_region_id, regionIds),
        isNull(taxRate.deleted_at),
      ),
    )
  const map = new Map<string, (typeof taxRate.$inferSelect)[]>()
  for (const row of rows) {
    if (!row.tax_region_id) continue
    const list = map.get(row.tax_region_id) ?? []
    list.push(row)
    map.set(row.tax_region_id, list)
  }
  return map
}

function attachTaxRates(
  region: typeof taxRegion.$inferSelect,
  ratesByRegion: Map<string, (typeof taxRate.$inferSelect)[]>,
) {
  return {
    ...region,
    tax_rates: ratesByRegion.get(region.id) ?? [],
  }
}

// ── Tax Regions ───────────────────────────────────────────────
export const taxRegionService = {
  async list(query: AdminGetTaxRegionsParamsType) {
    const db = getDb()
    const { limit, offset } = listLimitOffset(query, { limit: 20, offset: 0 })
    const conditions = [isNull(taxRegion.deleted_at)]

    if (query.q) {
      conditions.push(ilike(taxRegion.country_code, `%${query.q}%`)!)
    }
    if (query.country_code) {
      const codes = Array.isArray(query.country_code)
        ? query.country_code
        : [query.country_code]
      conditions.push(inArray(taxRegion.country_code, codes))
    }
    if (query.province_code) {
      const codes = Array.isArray(query.province_code)
        ? query.province_code
        : [query.province_code]
      conditions.push(inArray(taxRegion.province_code, codes))
    }
    if (query.parent_id === "null" || query.parent_id === null) {
      conditions.push(isNull(taxRegion.parent_id))
    } else if (query.parent_id) {
      const parentIds = Array.isArray(query.parent_id)
        ? query.parent_id
        : [query.parent_id]
      conditions.push(inArray(taxRegion.parent_id, parentIds))
    }
    if (query.id) {
      const ids = Array.isArray(query.id) ? query.id : [query.id]
      conditions.push(inArray(taxRegion.id, ids))
    }

    const where = and(...conditions)
    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(taxRegion)
        .where(where)
        .orderBy(desc(taxRegion.created_at))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(taxRegion).where(where),
    ])

    const ratesByRegion = await loadTaxRatesByRegionIds(rows.map((r) => r.id))
    return {
      tax_regions: rows.map((r) => attachTaxRates(r, ratesByRegion)),
      count: Number(total),
      limit,
      offset,
    }
  },
  async getById(id: string) {
    const db = getDb()
    const [item] = await db
      .select()
      .from(taxRegion)
      .where(and(eq(taxRegion.id, id), isNull(taxRegion.deleted_at)))
      .limit(1)
    if (!item) throw new HTTPException(404, { message: "未找到" })
    const ratesByRegion = await loadTaxRatesByRegionIds([id])
    return { tax_region: attachTaxRates(item, ratesByRegion) }
  },
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
