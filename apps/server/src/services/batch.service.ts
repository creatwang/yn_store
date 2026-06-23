import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm"
import {
  generateId,
  getDb,
  productCategory,
  productCollection,
  customerGroup,
  priceList,
  price,
  priceSet,
  priceRule,
  priceListRule,
  productVariantPriceSet,
  productVariant,
  taxRate,
  inventoryItem,
  inventoryLevel,
  shippingProfile,
  shippingOptionType,
  currency,
  promotion,
  promotionCampaign,
  campaignBudget,
  applicationMethod,
  promotionRule,
  promotionRuleValue,
  apiKey,
  workflowExecution,
  pricePreference,
  propertyLabel,
  paymentCollection,
  fulfillmentSet,
  fulfillmentProvider,
  locationFulfillmentProvider,
  stockLocation,
} from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import type {
  AdminFulfillmentProvidersParamsType,
  AdminGetApiKeysParamsType,
  AdminGetCollectionsParamsType,
  AdminGetInventoryItemsParamsType,
  AdminGetPromotionsParamsType,
  AdminGetPriceListsParamsType,
  AdminProductCategoriesParamsType,
} from "@my-store/validators/admin-list-params"
import {
  applyDateRangeConditions,
  applyInArrayCondition,
  applyNumberOperatorConditions,
  asDateRange,
  listLimitOffset,
  normalizeFilterIds,
} from "../lib/infra/query/query-filters"
import { stockLocationService, shippingOptionService } from "./stock-location.service"
import { getPromotionDetail } from "./promotion-detail.service"
import {
  insertPromotionRuleWithValues,
  linkApplicationMethodRule,
  linkPromotionCartRule,
  normalizeRuleValues,
  replacePromotionCartRules,
} from "./promotion-official-db"
import {
  enrichInventoryItemsForList,
  getInventoryItemDetail,
  loadInventoryLevelsForItem,
} from "./inventory-item-detail.service"
import { linkInventoryItemToVariantId } from "./inventory-variant-link.service"

const DEFAULT_RAW_USED = { value: "0", precision: 20 } as const

function sqlRows(result: unknown): Record<string, unknown>[] {
  return (
    Array.isArray(result)
      ? result
      : ((result as { rows?: Record<string, unknown>[] }).rows ?? [])
  ) as Record<string, unknown>[]
}

function bigNumberFromRow(
  numeric: string | null | undefined,
  raw: unknown,
): number {
  if (raw && typeof raw === "object" && "value" in (raw as object)) {
    const v = (raw as { value?: string }).value
    if (v != null && v !== "") return Number(v)
  }
  if (numeric != null && numeric !== "") return Number(numeric)
  return 0
}

function bigNumberInsert(value: number | null | undefined) {
  if (value == null) return { limit: null, raw_limit: null }
  const s = String(value)
  return {
    limit: s,
    raw_limit: { value: s, precision: 20 },
  }
}

function presentCampaignBudget(
  row: typeof campaignBudget.$inferSelect,
) {
  return {
    ...row,
    limit: bigNumberFromRow(row.limit, row.raw_limit),
    used: bigNumberFromRow(row.used, row.raw_used),
  }
}

function mkl<T extends { limit?: number; offset?: number }>(
  table: any,
  entityKey: string,
) {
  return async (query: T) => {
    const db = getDb()
    const { limit, offset } = listLimitOffset(query, { limit: 50, offset: 0 })
    const where = isNull(table.deleted_at)
    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(table)
        .where(where)
        .orderBy(desc(table.created_at))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(table).where(where),
    ])
    return { [entityKey]: rows, count: Number(total), limit, offset }
  }
}

async function listCollectionsFiltered(query: AdminGetCollectionsParamsType) {
  const db = getDb()
  const { limit, offset } = listLimitOffset(query, { limit: 10, offset: 0 })
  const conditions: any[] = [isNull(productCollection.deleted_at)]
  if (query.q) {
    conditions.push(ilike(productCollection.title, `%${query.q}%`))
  }
  applyDateRangeConditions(
    productCollection.created_at,
    asDateRange(query.created_at),
    conditions,
    sql,
  )
  applyDateRangeConditions(
    productCollection.updated_at,
    asDateRange(query.updated_at),
    conditions,
    sql,
  )
  const where = and(...conditions)
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(productCollection)
      .where(where)
      .orderBy(desc(productCollection.created_at))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(productCollection).where(where),
  ])
  return {
    collections: rows,
    count: Number(total),
    limit,
    offset,
  }
}

async function listCategoriesFiltered(query: AdminProductCategoriesParamsType) {
  const db = getDb()
  const { limit, offset } = listLimitOffset(query, { limit: 50, offset: 0 })
  const conditions: any[] = [isNull(productCategory.deleted_at)]
  if (query.q) {
    conditions.push(ilike(productCategory.name, `%${query.q}%`))
  }
  applyDateRangeConditions(
    productCategory.created_at,
    asDateRange(query.created_at),
    conditions,
    sql,
  )
  applyDateRangeConditions(
    productCategory.updated_at,
    asDateRange(query.updated_at),
    conditions,
    sql,
  )
  const where = and(...conditions)
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(productCategory)
      .where(where)
      .orderBy(desc(productCategory.created_at))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(productCategory).where(where),
  ])
  return {
    product_categories: rows,
    count: Number(total),
    limit,
    offset,
  }
}
const ENTITY_SINGULAR: Record<string, string> = {
  product_categories: "product_category",
  payment_collections: "payment_collection",
  workflow_executions: "workflow_execution",
  price_preferences: "price_preference",
  property_labels: "property_label",
  shipping_profiles: "shipping_profile",
  shipping_option_types: "shipping_option_type",
  customer_groups: "customer_group",
  price_lists: "price_list",
  inventory_items: "inventory_item",
  tax_rates: "tax_rate",
  api_keys: "api_key",
  promotions: "promotion",
  campaigns: "campaign",
  collections: "collection",
  reservations: "reservation",
}

function entitySingular(entityKey: string) {
  return (
    ENTITY_SINGULAR[entityKey] ??
    (entityKey.endsWith("s") ? entityKey.slice(0, -1) : entityKey)
  )
}

function mkg(table: any, entityKey: string) {
  return async (id: string) => {
    const db = getDb()
    const [item] = await db.select().from(table).where(and(eq(table.id, id), isNull(table.deleted_at))).limit(1)
    if (!item) throw new HTTPException(404, { message: "未找到" })
    return { [entitySingular(entityKey)]: item }
  }
}
function mkc(table: any, prefix: string, entityKey: string) {
  return async (input: any) => {
    const db = getDb()
    const id = generateId(prefix)
    const [created] = await db.insert(table).values({ id, ...input, created_at: sql`now()`, updated_at: sql`now()` }).returning()
    return { [entitySingular(entityKey)]: created }
  }
}
function mku(table: any, entityKey: string) {
  return async (id: string, input: any) => {
    const db = getDb()
    const [updated] = await db.update(table).set({ ...input, updated_at: sql`now()` }).where(and(eq(table.id, id), isNull(table.deleted_at))).returning()
    if (!updated) throw new HTTPException(404, { message: "未找到" })
    return { [entitySingular(entityKey)]: updated }
  }
}
function mkdel(table: any) {
  return async (id: string) => {
    const db = getDb()
    await db.update(table).set({ deleted_at: sql`now()`, updated_at: sql`now()` }).where(and(eq(table.id, id), isNull(table.deleted_at)))
    return { id, deleted: true }
  }
}

function slugHandle(value: string, fallback: string) {
  const handle = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return handle || fallback
}

// ── Categories ─────────────────────────────────────────────
export const categoryService = {
  list: listCategoriesFiltered,
  getById: mkg(productCategory, "product_categories"),
  create: async (input: Record<string, unknown>) => {
    const db = getDb()
    const id = generateId("pcat")
    const name = String(input.name ?? "Category")
    const handle = String(input.handle ?? slugHandle(name, id))
    const [created] = await db
      .insert(productCategory)
      .values({
        id,
        name,
        description: String(input.description ?? ""),
        handle,
        mpath: String(input.mpath ?? id),
        is_active: Boolean(input.is_active ?? false),
        is_internal: Boolean(input.is_internal ?? false),
        rank: Number(input.rank ?? 0),
        parent_category_id: (input.parent_category_id as string | null | undefined) ?? null,
        metadata: (input.metadata as Record<string, unknown> | null | undefined) ?? null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning()
    return { product_category: created }
  },
  update: mku(productCategory, "product_categories"),
  delete: mkdel(productCategory),
}

// ── Collections ─────────────────────────────────────────────
export const collectionService = {
  list: listCollectionsFiltered,
  getById: mkg(productCollection, "collections"),
  create: async (input: Record<string, unknown>) => {
    const db = getDb()
    const id = generateId("pcol")
    const title = String(input.title ?? "Collection")
    const handle = String(input.handle ?? slugHandle(title, id))
    const [created] = await db
      .insert(productCollection)
      .values({
        id,
        title,
        handle,
        metadata: (input.metadata as Record<string, unknown> | null | undefined) ?? null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning()
    return { collection: created }
  },
  update: mku(productCollection, "collections"),
  delete: mkdel(productCollection),
}

// ── Customer Groups ─────────────────────────────────────────
export const customerGroupService = {
  list: mkl(customerGroup, "customer_groups"),
  getById: mkg(customerGroup, "customer_groups"),
  create: mkc(customerGroup, "cgrp", "customer_groups"),
  update: mku(customerGroup, "customer_groups"),
  delete: mkdel(customerGroup),
}

async function listPriceListsFiltered(query: AdminGetPriceListsParamsType) {
  const db = getDb()
  const { limit, offset } = listLimitOffset(query, { limit: 50, offset: 0 })
  const conditions: unknown[] = [isNull(priceList.deleted_at)]

  if (query.q) {
    conditions.push(ilike(priceList.title, `%${query.q}%`))
  }

  applyInArrayCondition(priceList.id, query.id, conditions)
  applyDateRangeConditions(
    priceList.starts_at,
    asDateRange(query.starts_at),
    conditions,
    sql,
  )
  applyDateRangeConditions(
    priceList.ends_at,
    asDateRange(query.ends_at),
    conditions,
    sql,
  )

  if (query.status?.length) {
    conditions.push(inArray(priceList.status, query.status))
  }

  const where = and(...(conditions as Parameters<typeof and>[0][]))
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(priceList)
      .where(where)
      .orderBy(desc(priceList.created_at))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(priceList).where(where),
  ])

  return {
    price_lists: rows,
    count: Number(total),
    limit,
    offset,
  }
}

async function listPromotionsFiltered(query: AdminGetPromotionsParamsType) {
  const db = getDb()
  const { limit, offset } = listLimitOffset(query, { limit: 50, offset: 0 })
  const conditions: unknown[] = [isNull(promotion.deleted_at)]

  if (query.q) {
    const term = `%${query.q}%`
    conditions.push(
      or(ilike(promotion.code, term), ilike(promotion.id, term))!,
    )
  }

  applyInArrayCondition(promotion.id, query.id, conditions)
  applyInArrayCondition(promotion.code, query.code, conditions)
  applyInArrayCondition(promotion.campaign_id, query.campaign_id, conditions)
  applyDateRangeConditions(
    promotion.created_at,
    asDateRange(query.created_at),
    conditions,
    sql,
  )
  applyDateRangeConditions(
    promotion.updated_at,
    asDateRange(query.updated_at),
    conditions,
    sql,
  )

  const where = and(...(conditions as Parameters<typeof and>[0][]))
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(promotion)
      .where(where)
      .orderBy(desc(promotion.created_at))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(promotion).where(where),
  ])

  return {
    promotions: rows,
    count: Number(total),
    limit,
    offset,
  }
}

function aggregatePriceListRules(
  rows: { attribute: string; value: unknown }[],
): Record<string, string[]> {
  const rules: Record<string, string[]> = {}
  for (const row of rows) {
    const values: string[] = []
    if (Array.isArray(row.value)) {
      for (const v of row.value) values.push(String(v))
    } else if (row.value != null) {
      values.push(String(row.value))
    }
    if (!values.length) continue
    const list = rules[row.attribute] ?? []
    for (const v of values) {
      if (!list.includes(v)) list.push(v)
    }
    rules[row.attribute] = list
  }
  return rules
}

async function syncPriceListRules(
  priceListId: string,
  rules: Record<string, unknown> | undefined,
) {
  if (rules === undefined) return

  const db = getDb()
  const attributes = Object.keys(rules)
  if (attributes.length) {
    await db
      .delete(priceListRule)
      .where(
        and(
          eq(priceListRule.price_list_id, priceListId),
          inArray(priceListRule.attribute, attributes),
        ),
      )
  }

  for (const [attribute, raw] of Object.entries(rules)) {
    const values = Array.isArray(raw)
      ? raw
      : raw != null
        ? [raw]
        : []
    for (const val of values) {
      await db.insert(priceListRule).values({
        id: generateId("prule"),
        attribute,
        value: [String(val)],
        price_list_id: priceListId,
      })
    }
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(priceListRule)
    .where(eq(priceListRule.price_list_id, priceListId))

  await db
    .update(priceList)
    .set({ rules_count: Number(total ?? 0), updated_at: sql`now()` })
    .where(eq(priceList.id, priceListId))
}

async function resolveVariantPriceSetId(
  db: ReturnType<typeof getDb>,
  variantId: string,
): Promise<string> {
  const links = sqlRows(
    await db.execute(sql`
      SELECT price_set_id
      FROM product_variant_price_set
      WHERE variant_id = ${variantId}
      LIMIT 1
    `),
  )
  if (links[0]?.price_set_id) {
    return String(links[0].price_set_id)
  }

  const priceSetId = generateId("pset")
  await db.insert(priceSet).values({ id: priceSetId })
  await db.insert(productVariantPriceSet).values({
    id: generateId("pvps"),
    variant_id: variantId,
    price_set_id: priceSetId,
  })
  return priceSetId
}

async function syncPriceRulesForPrice(
  db: ReturnType<typeof getDb>,
  priceId: string,
  rules?: Record<string, string>,
) {
  await db.delete(priceRule).where(eq(priceRule.price_id, priceId))
  const regionId = rules?.region_id
  if (!regionId) {
    await db
      .update(price)
      .set({ rules_count: 0, updated_at: sql`now()` })
      .where(eq(price.id, priceId))
    return
  }

  await db.insert(priceRule).values({
    id: generateId("prule"),
    attribute: "region_id",
    value: regionId,
    price_id: priceId,
  })
  await db
    .update(price)
    .set({ rules_count: 1, updated_at: sql`now()` })
    .where(eq(price.id, priceId))
}

async function enrichPriceListPrices(
  priceRows: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  if (priceRows.length === 0) return priceRows

  const db = getDb()
  const priceIds = priceRows.map((r) => String(r.id))
  const ruleRows = await db
    .select()
    .from(priceRule)
    .where(inArray(priceRule.price_id, priceIds))

  const rulesByPriceId = new Map<string, Record<string, string>>()
  for (const rule of ruleRows) {
    const existing = rulesByPriceId.get(rule.price_id) ?? {}
    existing[rule.attribute] = rule.value
    rulesByPriceId.set(rule.price_id, existing)
  }

  return priceRows.map((row) => ({
    ...row,
    amount: row.amount != null ? Number(row.amount) : row.amount,
    rules: rulesByPriceId.get(String(row.id)) ?? {},
  }))
}

async function loadPriceListDetail(id: string) {
  const db = getDb()
  const [item] = await db
    .select()
    .from(priceList)
    .where(and(eq(priceList.id, id), isNull(priceList.deleted_at)))
    .limit(1)
  if (!item) throw new HTTPException(404, { message: "未找到" })

  const ruleRows = await db
    .select()
    .from(priceListRule)
    .where(eq(priceListRule.price_list_id, id))

  const priceRows = sqlRows(
    await db.execute(sql`
      SELECT pr.*, pvps.variant_id
      FROM price pr
      LEFT JOIN product_variant_price_set pvps
        ON pvps.price_set_id = pr.price_set_id
      WHERE pr.price_list_id = ${id}
        AND pr.deleted_at IS NULL
    `),
  )

  return {
    price_list: {
      ...item,
      rules: aggregatePriceListRules(ruleRows),
      prices: await enrichPriceListPrices(priceRows),
    },
  }
}

// ── Price Lists ─────────────────────────────────────────────
export const priceListService = {
  list: listPriceListsFiltered,
  getById: loadPriceListDetail,
  async create(input: Record<string, unknown>) {
    const db = getDb()
    const { rules, ...fields } = input
    const id = generateId("plist")
    const [created] = await db
      .insert(priceList)
      .values({
        id,
        title: String(fields.title ?? "Price list"),
        description: String(fields.description ?? ""),
        status: String(fields.status ?? "draft"),
        type: String(fields.type ?? "sale"),
        starts_at: (fields.starts_at as Date | null | undefined) ?? null,
        ends_at: (fields.ends_at as Date | null | undefined) ?? null,
        metadata: (fields.metadata as Record<string, unknown> | null) ?? null,
        rules_count: 0,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning()
    if (rules && typeof rules === "object") {
      await syncPriceListRules(
        id,
        rules as Record<string, unknown>,
      )
    }
    return loadPriceListDetail(id)
  },
  async update(id: string, input: Record<string, unknown>) {
    const db = getDb()
    const { rules, ...fields } = input
    const set: Record<string, unknown> = { updated_at: sql`now()` }
    if (fields.title !== undefined) set.title = String(fields.title)
    if (fields.description !== undefined) {
      set.description = String(fields.description)
    }
    if (fields.status !== undefined) set.status = String(fields.status)
    if (fields.type !== undefined) set.type = String(fields.type)
    if (fields.starts_at !== undefined) {
      set.starts_at =
        fields.starts_at == null || fields.starts_at === ""
          ? null
          : new Date(fields.starts_at as string)
    }
    if (fields.ends_at !== undefined) {
      set.ends_at =
        fields.ends_at == null || fields.ends_at === ""
          ? null
          : new Date(fields.ends_at as string)
    }
    if (fields.metadata !== undefined) set.metadata = fields.metadata
    const [updated] = await db
      .update(priceList)
      .set(set)
      .where(and(eq(priceList.id, id), isNull(priceList.deleted_at)))
      .returning()
    if (!updated) throw new HTTPException(404, { message: "未找到" })
    if (rules !== undefined && typeof rules === "object") {
      await syncPriceListRules(id, rules as Record<string, unknown>)
    }
    return loadPriceListDetail(id)
  },
  delete: mkdel(priceList),
}

// ── Tax Rates ───────────────────────────────────────────────
export const taxRateService = {
  list: mkl(taxRate, "tax_rates"),
  getById: mkg(taxRate, "tax_rates"),
  create: mkc(taxRate, "txr", "tax_rates"),
  update: mku(taxRate, "tax_rates"),
  delete: mkdel(taxRate),
}

// ── Inventory Items ─────────────────────────────────────────
export const inventoryItemService = {
  async list(query: AdminGetInventoryItemsParamsType) {
    const { limit, offset } = listLimitOffset(query, { limit: 50, offset: 0 })
    const db = getDb()
    const conditions: unknown[] = [isNull(inventoryItem.deleted_at)]

    if (typeof query.q === "string" && query.q.trim()) {
      const term = `%${query.q.trim()}%`
      conditions.push(
        or(
          ilike(inventoryItem.title, term),
          ilike(inventoryItem.sku, term),
          ilike(inventoryItem.description, term),
        )!,
      )
    }

    applyInArrayCondition(inventoryItem.id, query.id, conditions)
    applyInArrayCondition(inventoryItem.sku, query.sku, conditions)
    applyInArrayCondition(inventoryItem.material, query.material, conditions)
    applyInArrayCondition(inventoryItem.mid_code, query.mid_code, conditions)
    applyInArrayCondition(inventoryItem.hs_code, query.hs_code, conditions)
    applyInArrayCondition(
      inventoryItem.origin_country,
      query.origin_country,
      conditions,
    )

    if (query.requires_shipping !== undefined) {
      const requiresShipping =
        query.requires_shipping === true ||
        query.requires_shipping === "true"
      conditions.push(eq(inventoryItem.requires_shipping, requiresShipping))
    }

    applyNumberOperatorConditions(inventoryItem.weight, query.weight, conditions)
    applyNumberOperatorConditions(inventoryItem.width, query.width, conditions)
    applyNumberOperatorConditions(
      inventoryItem.length,
      query.length,
      conditions,
    )
    applyNumberOperatorConditions(inventoryItem.height, query.height, conditions)

    const locationIds = normalizeFilterIds(
      query.location_levels?.location_id as never,
    )
    if (locationIds?.length) {
      conditions.push(
        inArray(
          inventoryItem.id,
          db
            .select({ id: inventoryLevel.inventory_item_id })
            .from(inventoryLevel)
            .where(
              and(
                inArray(inventoryLevel.location_id, locationIds),
                isNull(inventoryLevel.deleted_at),
              ),
            ),
        ),
      )
    }

    const orderParam = query.order ?? "-created_at"
    const orderDesc = orderParam.startsWith("-")
    const orderKey = orderDesc ? orderParam.slice(1) : orderParam
    const orderColumns: Record<string, typeof inventoryItem.created_at> = {
      created_at: inventoryItem.created_at,
      updated_at: inventoryItem.updated_at,
      title: inventoryItem.title,
      sku: inventoryItem.sku,
    }
    const orderColumn = orderColumns[orderKey] ?? inventoryItem.created_at

    const where = and(...(conditions as Parameters<typeof and>[0][]))
    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(inventoryItem)
        .where(where)
        .orderBy(orderDesc ? desc(orderColumn) : asc(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(inventoryItem).where(where),
    ])
    return {
      inventory_items: await enrichInventoryItemsForList(rows),
      count: Number(total),
      limit,
      offset,
    }
  },
  getById: getInventoryItemDetail,
  async create(input: Record<string, unknown>) {
    const db = getDb()
    const id = generateId("iitem")
    const [created] = await db
      .insert(inventoryItem)
      .values({
        id,
        sku: (input.sku as string | null | undefined) ?? null,
        title: (input.title as string | null | undefined) ?? null,
        description: (input.description as string | null | undefined) ?? null,
        thumbnail: (input.thumbnail as string | null | undefined) ?? null,
        requires_shipping: Boolean(input.requires_shipping ?? true),
        hs_code: (input.hs_code as string | null | undefined) ?? null,
        origin_country: (input.origin_country as string | null | undefined) ?? null,
        mid_code: (input.mid_code as string | null | undefined) ?? null,
        material: (input.material as string | null | undefined) ?? null,
        weight: (input.weight as number | null | undefined) ?? null,
        length: (input.length as number | null | undefined) ?? null,
        height: (input.height as number | null | undefined) ?? null,
        width: (input.width as number | null | undefined) ?? null,
        metadata: (input.metadata as Record<string, unknown> | null) ?? null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning()

    const variantId = input.variant_id as string | undefined
    if (variantId) {
      await linkInventoryItemToVariantId(id, variantId)
    }

    return getInventoryItemDetail(id)
  },
  async update(id: string, input: Record<string, unknown>) {
    const db = getDb()
    const set: Record<string, unknown> = { updated_at: sql`now()` }
    const fields = [
      "sku",
      "title",
      "description",
      "thumbnail",
      "requires_shipping",
      "hs_code",
      "origin_country",
      "mid_code",
      "material",
      "weight",
      "length",
      "height",
      "width",
      "metadata",
    ] as const
    for (const key of fields) {
      if (input[key] !== undefined) set[key] = input[key]
    }
    const [updated] = await db
      .update(inventoryItem)
      .set(set)
      .where(and(eq(inventoryItem.id, id), isNull(inventoryItem.deleted_at)))
      .returning()
    if (!updated) throw new HTTPException(404, { message: "未找到" })
    return getInventoryItemDetail(id)
  },
  delete: mkdel(inventoryItem),
  async listLevels(inventoryItemId: string) {
    const rows = await loadInventoryLevelsForItem(inventoryItemId)
    return { inventory_levels: rows, count: rows.length }
  },
}

export { reservationService } from "./reservation.service"

// ── Stock Locations / Shipping Options → stock-location.service.ts ──
export { stockLocationService, shippingOptionService }

// ── Shipping Profiles ───────────────────────────────────────
export const shippingProfileService = {
  list: mkl(shippingProfile, "shipping_profiles"),
  getById: mkg(shippingProfile, "shipping_profiles"),
  create: mkc(shippingProfile, "sp", "shipping_profiles"),
  update: mku(shippingProfile, "shipping_profiles"),
  delete: mkdel(shippingProfile),
}

// ── Shipping Option Types ───────────────────────────────────
export const shippingOptionTypeService = {
  list: mkl(shippingOptionType, "shipping_option_types"),
  getById: mkg(shippingOptionType, "shipping_option_types"),
  create: mkc(shippingOptionType, "sot", "shipping_option_types"),
  update: mku(shippingOptionType, "shipping_option_types"),
  delete: mkdel(shippingOptionType),
}

// ── Currencies ──────────────────────────────────────────────
export const currencyService = {
  async list() {
    const db = getDb()
    const rows = await db.select().from(currency)
    return { currencies: rows, count: rows.length }
  },
  async getByCode(code: string) {
    const db = getDb()
    const [item] = await db.select().from(currency).where(eq(currency.code, code)).limit(1)
    if (!item) throw new HTTPException(404, { message: "未找到" })
    return { currency: item }
  },
}

// ── Promotions ────────────────────────────────────────────
export const promotionService = {
  list: listPromotionsFiltered,
  getById: getPromotionDetail,
  delete: mkdel(promotion),

  async create(input: Record<string, unknown>) {
    const db = getDb()
    const id = generateId("promo")
    let { application_method, rules, ...promoFields } = input
    if (
      !application_method &&
      promoFields.metadata &&
      typeof promoFields.metadata === "object"
    ) {
      const meta = promoFields.metadata as Record<string, unknown>
      if (meta.application_type != null || meta.value != null) {
        application_method = {
          type: meta.application_type ?? "percentage",
          target_type: "items",
          value: meta.value ?? 0,
        }
      }
    }
    await db.insert(promotion).values({
      id,
      code: String(promoFields.code ?? ""),
      type: String(promoFields.type ?? "standard"),
      status: String(promoFields.status ?? "draft"),
      is_automatic: Boolean(promoFields.is_automatic ?? false),
      is_tax_inclusive: Boolean(promoFields.is_tax_inclusive ?? false),
      campaign_id: (promoFields.campaign_id as string | null) ?? null,
      limit: (promoFields.limit as number | null | undefined) ?? null,
      used: 0,
      metadata: (promoFields.metadata as Record<string, unknown> | null) ?? null,
      created_at: sql`now()`,
      updated_at: sql`now()`,
    })

    // Write application_method
    const am = application_method as Record<string, unknown> | undefined
    if (am) {
      const amId = generateId("proappmet")
      const amValue = am.value != null ? Number(am.value) : 0
      await db.insert(applicationMethod).values({
        id: amId,
        promotion_id: id,
        type: String(am.type ?? "percentage"),
        target_type: String(am.target_type ?? "items"),
        allocation: (am.allocation as string | undefined) ?? "across",
        value: String(amValue),
        raw_value: { value: String(amValue), precision: 20 },
        currency_code:
          (am.currency_code as string | null | undefined) ?? "usd",
        max_quantity: (am.max_quantity as number | null | undefined) ?? null,
        apply_to_quantity:
          (am.apply_to_quantity as number | null | undefined) ?? null,
        buy_rules_min_quantity:
          (am.buy_rules_min_quantity as number | null | undefined) ?? null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })

      for (const [key, kind] of [
        ["target_rules", "target-rules"],
        ["buy_rules", "buy-rules"],
      ] as const) {
        const ruleList = (am[key] as Array<Record<string, unknown>>) ?? []
        for (const r of ruleList) {
          const ruleId = await insertPromotionRuleWithValues({
            attribute: String(r.attribute ?? ""),
            operator: String(r.operator ?? "eq"),
            description: (r.description as string | null) ?? null,
            values: normalizeRuleValues(r.values ?? r.value),
          })
          await linkApplicationMethodRule(amId, ruleId, kind)
        }
      }
    }

    const ruleList = (rules as Array<Record<string, unknown>>) ?? []
    for (const r of ruleList) {
      const ruleId = await insertPromotionRuleWithValues({
        attribute: String(r.attribute ?? ""),
        operator: String(r.operator ?? "eq"),
        description: (r.description as string | null) ?? null,
        values: normalizeRuleValues(r.values ?? r.value),
      })
      await linkPromotionCartRule(id, ruleId)
    }

    return getPromotionDetail(id)
  },

  async update(id: string, input: Record<string, unknown>) {
    const db = getDb()
    const { application_method, rules, ...promoFields } = input
    const [updated] = await db.update(promotion).set({
      ...(promoFields.code !== undefined && { code: String(promoFields.code) }),
      ...(promoFields.type !== undefined && { type: String(promoFields.type) }),
      ...(promoFields.status !== undefined && { status: String(promoFields.status) }),
      ...(promoFields.is_automatic !== undefined && { is_automatic: Boolean(promoFields.is_automatic) }),
      ...(promoFields.is_tax_inclusive !== undefined && { is_tax_inclusive: Boolean(promoFields.is_tax_inclusive) }),
      ...(promoFields.campaign_id !== undefined && { campaign_id: promoFields.campaign_id as string | null }),
      ...(promoFields.limit !== undefined && { limit: promoFields.limit as number | null }),
      ...(promoFields.metadata !== undefined && { metadata: promoFields.metadata as Record<string, unknown> | null }),
      updated_at: sql`now()`,
    }).where(and(eq(promotion.id, id), isNull(promotion.deleted_at))).returning()
    if (!updated) throw new HTTPException(404, { message: "未找到" })

    // Update application_method if provided
    const am = application_method as Record<string, unknown> | undefined
    if (am) {
      const [existingAm] = await db.select().from(applicationMethod).where(eq(applicationMethod.promotion_id, id)).limit(1)
      if (existingAm) {
        const amValue = am.value != null ? Number(am.value) : undefined
        const setAm: Record<string, any> = { updated_at: sql`now()` }
        if (am.type !== undefined) setAm.type = String(am.type)
        if (am.target_type !== undefined) setAm.target_type = String(am.target_type)
        if (am.allocation !== undefined) setAm.allocation = String(am.allocation)
        if (amValue !== undefined) { setAm.value = String(amValue); setAm.raw_value = { value: String(amValue), precision: 20 } }
        if (am.currency_code !== undefined) setAm.currency_code = am.currency_code as string | null
        if (am.max_quantity !== undefined) setAm.max_quantity = am.max_quantity as number | null
        if (am.apply_to_quantity !== undefined) setAm.apply_to_quantity = am.apply_to_quantity as number | null
        if (am.buy_rules_min_quantity !== undefined) setAm.buy_rules_min_quantity = am.buy_rules_min_quantity as number | null
        await db.update(applicationMethod).set(setAm).where(eq(applicationMethod.id, existingAm.id))
      } else {
        const amId = generateId("proappmet")
        const amValue = am.value != null ? Number(am.value) : 0
        await db.insert(applicationMethod).values({
          id: amId,
          promotion_id: id,
          type: String(am.type ?? "percentage"),
          target_type: String(am.target_type ?? "items"),
          allocation: (am.allocation as string) ?? "across",
          value: String(amValue),
          raw_value: { value: String(amValue), precision: 20 },
          currency_code: (am.currency_code as string | null) ?? "usd",
          max_quantity: (am.max_quantity as number | null) ?? null,
          apply_to_quantity: (am.apply_to_quantity as number | null) ?? null,
          buy_rules_min_quantity:
            (am.buy_rules_min_quantity as number | null) ?? null,
          created_at: sql`now()`,
          updated_at: sql`now()`,
        })
      }
    }

    if (rules !== undefined) {
      const ruleList = (rules as Array<Record<string, unknown>>).map((r) => ({
        attribute: String(r.attribute ?? ""),
        operator: String(r.operator ?? "eq"),
        description: (r.description as string | null) ?? null,
        values: normalizeRuleValues(r.values ?? r.value),
      }))
      await replacePromotionCartRules(id, ruleList)
    }

    return getPromotionDetail(id)
  },
}

async function loadCampaignDetail(id: string) {
  const db = getDb()
  const [camp] = await db
    .select()
    .from(promotionCampaign)
    .where(
      and(eq(promotionCampaign.id, id), isNull(promotionCampaign.deleted_at)),
    )
    .limit(1)
  if (!camp) throw new HTTPException(404, { message: "未找到" })
  const [budget] = await db
    .select()
    .from(campaignBudget)
    .where(eq(campaignBudget.campaign_id, id))
    .limit(1)
  const promos = await db
    .select()
    .from(promotion)
    .where(
      and(eq(promotion.campaign_id, id), isNull(promotion.deleted_at)),
    )
  return {
    campaign: {
      ...camp,
      budget: budget ? presentCampaignBudget(budget) : undefined,
      promotions: promos,
    },
  }
}

// ── Campaigns ──────────────────────────────────────────────
export const campaignService = {
  list: mkl(promotionCampaign, "campaigns"),
  getById: loadCampaignDetail,
  async create(input: Record<string, unknown>) {
    const db = getDb()
    const id = generateId("camp")
    const { budget, ...fields } = input
    await db.insert(promotionCampaign).values({
      id,
      name: String(fields.name ?? "Campaign"),
      description: (fields.description as string | null | undefined) ?? null,
      campaign_identifier: String(
        fields.campaign_identifier ?? id.replace("camp_", "camp-"),
      ),
      starts_at: (fields.starts_at as Date | null | undefined) ?? null,
      ends_at: (fields.ends_at as Date | null | undefined) ?? null,
      created_at: sql`now()`,
      updated_at: sql`now()`,
    })
    const budgetInput = budget as Record<string, unknown> | undefined
    if (budgetInput?.type) {
      const bn = bigNumberInsert(
        budgetInput.limit as number | null | undefined,
      )
      await db.insert(campaignBudget).values({
        id: generateId("probudg"),
        campaign_id: id,
        type: String(budgetInput.type),
        currency_code: (budgetInput.currency_code as string | null) ?? null,
        limit: bn.limit,
        raw_limit: bn.raw_limit,
        attribute: (budgetInput.attribute as string | null) ?? null,
        used: "0",
        raw_used: DEFAULT_RAW_USED,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
    }
    return loadCampaignDetail(id)
  },
  async update(id: string, input: Record<string, unknown>) {
    const db = getDb()
    const { budget, ...fields } = input
    const set: Record<string, unknown> = { updated_at: sql`now()` }
    if (fields.name !== undefined) set.name = String(fields.name)
    if (fields.description !== undefined) set.description = fields.description
    if (fields.campaign_identifier !== undefined) {
      set.campaign_identifier = String(fields.campaign_identifier)
    }
    if (fields.starts_at !== undefined) set.starts_at = fields.starts_at
    if (fields.ends_at !== undefined) set.ends_at = fields.ends_at
    const [updated] = await db
      .update(promotionCampaign)
      .set(set)
      .where(
        and(eq(promotionCampaign.id, id), isNull(promotionCampaign.deleted_at)),
      )
      .returning()
    if (!updated) throw new HTTPException(404, { message: "未找到" })
    const budgetInput = budget as Record<string, unknown> | undefined
    if (budgetInput) {
      const [existing] = await db
        .select()
        .from(campaignBudget)
        .where(eq(campaignBudget.campaign_id, id))
        .limit(1)
      if (existing) {
        const bset: Record<string, unknown> = { updated_at: sql`now()` }
        if (budgetInput.type !== undefined) bset.type = String(budgetInput.type)
        if (budgetInput.currency_code !== undefined) {
          bset.currency_code = budgetInput.currency_code
        }
        if (budgetInput.limit !== undefined) {
          const bn = bigNumberInsert(
            budgetInput.limit as number | null | undefined,
          )
          bset.limit = bn.limit
          bset.raw_limit = bn.raw_limit
        }
        if (budgetInput.attribute !== undefined) {
          bset.attribute = budgetInput.attribute
        }
        await db
          .update(campaignBudget)
          .set(bset)
          .where(eq(campaignBudget.id, existing.id))
      } else if (budgetInput.type) {
        const bn = bigNumberInsert(
          budgetInput.limit as number | null | undefined,
        )
        await db.insert(campaignBudget).values({
          id: generateId("probudg"),
          campaign_id: id,
          type: String(budgetInput.type),
          currency_code: (budgetInput.currency_code as string | null) ?? null,
          limit: bn.limit,
          raw_limit: bn.raw_limit,
          attribute: (budgetInput.attribute as string | null) ?? null,
          used: "0",
          raw_used: DEFAULT_RAW_USED,
          created_at: sql`now()`,
          updated_at: sql`now()`,
        })
      }
    }
    return loadCampaignDetail(id)
  },
  delete: mkdel(promotionCampaign),
}

// ── API Keys ───────────────────────────────────────────────
export const apiKeyService = {
  async list(query: AdminGetApiKeysParamsType) {
    const db = getDb()
    const { limit, offset } = listLimitOffset(query, { limit: 50, offset: 0 })
    const conditions: Parameters<typeof and>[0][] = [isNull(apiKey.deleted_at)]

    if (query.type) {
      conditions.push(eq(apiKey.type, query.type))
    }
    if (query.q) {
      conditions.push(ilike(apiKey.title, `%${query.q}%`))
    }
    applyDateRangeConditions(
      apiKey.created_at,
      asDateRange(query.created_at),
      conditions,
      sql,
    )
    applyDateRangeConditions(
      apiKey.updated_at,
      asDateRange(query.updated_at),
      conditions,
      sql,
    )
    applyDateRangeConditions(
      apiKey.revoked_at,
      asDateRange(query.revoked_at),
      conditions,
      sql,
    )

    const where = and(...conditions)
    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(apiKey)
        .where(where)
        .orderBy(desc(apiKey.created_at))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(apiKey).where(where),
    ])

    return {
      api_keys: rows,
      count: Number(total),
      limit,
      offset,
    }
  },
  getById: mkg(apiKey, "api_keys"),
  create: mkc(apiKey, "ak", "api_keys"),
  update: mku(apiKey, "api_keys"),
  delete: mkdel(apiKey),
  async revoke(id: string) {
    const db = getDb()
    const [updated] = await db
      .update(apiKey)
      .set({
        revoked_at: sql`now()`,
        revoked_by: "admin",
        updated_at: sql`now()`,
      })
      .where(and(eq(apiKey.id, id), isNull(apiKey.deleted_at)))
      .returning()
    if (!updated) throw new HTTPException(404, { message: "未找到" })
    return { api_key: updated }
  },
  async batchSalesChannels(id: string, _body: Record<string, unknown>) {
    return apiKeyService.getById(id)
  },
}

// Notifications: use services/notification.service.ts (adminNotifications routes)

// ── Workflow Executions ────────────────────────────────────
export const workflowExecutionService = { list: mkl(workflowExecution, "workflow_executions"), getById: mkg(workflowExecution, "workflow_executions") }

// ── Price Preferences ──────────────────────────────────────
export const pricePreferenceService = { list: mkl(pricePreference, "price_preferences"), getById: mkg(pricePreference, "price_preferences"), create: mkc(pricePreference, "ppref", "price_preferences"), update: mku(pricePreference, "price_preferences"), delete: mkdel(pricePreference) }

// ── Property Labels ────────────────────────────────────────
export const propertyLabelService = { list: mkl(propertyLabel, "property_labels"), getById: mkg(propertyLabel, "property_labels"), create: mkc(propertyLabel, "pl", "property_labels"), update: mku(propertyLabel, "property_labels"), delete: mkdel(propertyLabel) }

export const paymentCollectionService = { list: mkl(paymentCollection, "payment_collections"), getById: mkg(paymentCollection, "payment_collections") }

export const inventoryLevelService = {
  async list(iid: string) {
    const rows = await loadInventoryLevelsForItem(iid)
    return { inventory_levels: rows, count: rows.length }
  },
  async update(iid: string, lid: string, input: any) {
    const db = getDb()
    const qty = input.stocked_quantity ?? input.quantity ?? 0
    const [u] = await db
      .update(inventoryLevel)
      .set({
        stocked_quantity: String(qty),
        raw_stocked_quantity: { amount: qty, precision: 0 },
      })
      .where(and(eq(inventoryLevel.inventory_item_id, iid), eq(inventoryLevel.location_id, lid)))
      .returning()
    if (!u) throw new HTTPException(404, { message: "未找到" })
    const levels = await loadInventoryLevelsForItem(iid)
    const level = levels.find((row) => row.location_id === lid)
    return { inventory_level: level ?? u }
  },
  async delete(iid: string, lid: string) {
    const db = getDb()
    await db.delete(inventoryLevel).where(
      and(eq(inventoryLevel.inventory_item_id, iid), eq(inventoryLevel.location_id, lid)),
    )
    return { deleted: true }
  },
  async batchForItem(
    inventoryItemId: string,
    input: {
      create?: Array<{ location_id: string; stocked_quantity?: number }>
      update?: Array<{ location_id: string; stocked_quantity?: number }>
      /** 官方 UI 传 inventory_level.id 字符串数组 */
      delete?: Array<string | { location_id: string }>
    },
  ) {
    const db = getDb()
    const deleteRows: Array<{
      inventory_item_id: string
      location_id: string
    }> = []

    for (const entry of input.delete ?? []) {
      if (typeof entry === "string") {
        const [level] = await db
          .select({ location_id: inventoryLevel.location_id })
          .from(inventoryLevel)
          .where(
            and(
              eq(inventoryLevel.id, entry),
              eq(inventoryLevel.inventory_item_id, inventoryItemId),
            ),
          )
          .limit(1)
        if (level) {
          deleteRows.push({
            inventory_item_id: inventoryItemId,
            location_id: level.location_id,
          })
        }
        continue
      }
      if (entry.location_id) {
        deleteRows.push({
          inventory_item_id: inventoryItemId,
          location_id: entry.location_id,
        })
      }
    }

    return this.batch({
      create: (input.create ?? []).map((row) => ({
        inventory_item_id: inventoryItemId,
        location_id: row.location_id,
        stocked_quantity: row.stocked_quantity,
      })),
      update: (input.update ?? []).map((row) => ({
        inventory_item_id: inventoryItemId,
        location_id: row.location_id,
        stocked_quantity: row.stocked_quantity,
      })),
      delete: deleteRows,
    })
  },
  async batch(input: {
    create?: Array<{ inventory_item_id: string; location_id: string; stocked_quantity?: number }>
    update?: Array<{ inventory_item_id: string; location_id: string; stocked_quantity?: number }>
    delete?: Array<{ inventory_item_id: string; location_id: string }>
  }) {
    const db = getDb()
    const created: typeof inventoryLevel.$inferSelect[] = []
    const updated: typeof inventoryLevel.$inferSelect[] = []

    for (const row of input.create ?? []) {
      const locationId = row.location_id?.trim()
      if (!locationId) continue

      const [location] = await db
        .select({ id: stockLocation.id })
        .from(stockLocation)
        .where(
          and(eq(stockLocation.id, locationId), isNull(stockLocation.deleted_at)),
        )
        .limit(1)
      if (!location) continue

      const id = generateId("ilev")
      const qty = row.stocked_quantity ?? 0
      const [c] = await db
        .insert(inventoryLevel)
        .values({
          id,
          inventory_item_id: row.inventory_item_id,
          location_id: locationId,
          stocked_quantity: String(qty),
          raw_stocked_quantity: { amount: qty, precision: 0 },
        })
        .returning()
      created.push(c)
    }

    for (const row of input.update ?? []) {
      const res = await this.update(row.inventory_item_id, row.location_id, row)
      updated.push(res.inventory_level)
    }

    for (const row of input.delete ?? []) {
      await this.delete(row.inventory_item_id, row.location_id)
    }

    return {
      created,
      updated,
      deleted: (input.delete ?? []).length,
    }
  },
}

export const priceListPriceService = {
  async list(plid: string) {
    const db = getDb()
    const rows = await db
      .select()
      .from(price)
      .where(and(eq(price.price_list_id, plid), isNull(price.deleted_at)))
    const prices = await enrichPriceListPrices(rows as Record<string, unknown>[])
    return { prices, count: prices.length }
  },
  async add(plid: string, input: Record<string, unknown>) {
    const db = getDb()
    const variantId = input.variant_id as string | undefined
    let priceSetId = input.price_set_id as string | undefined
    if (!priceSetId && variantId) {
      priceSetId = await resolveVariantPriceSetId(db, variantId)
    }
    if (!priceSetId) {
      priceSetId = generateId("pset")
      await db.insert(priceSet).values({ id: priceSetId })
    }

    const amount = input.amount ?? 0
    const rules = input.rules as Record<string, string> | undefined
    const id = generateId("pr")
    const [created] = await db
      .insert(price)
      .values({
        id,
        price_list_id: plid,
        currency_code: String(input.currency_code ?? "USD"),
        amount: String(amount),
        raw_amount: { amount, precision: 2 },
        price_set_id: priceSetId,
        rules_count: rules?.region_id ? 1 : 0,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning()

    if (rules?.region_id) {
      await db.insert(priceRule).values({
        id: generateId("prule"),
        attribute: "region_id",
        value: rules.region_id,
        price_id: id,
      })
    }

    const [enriched] = await enrichPriceListPrices([
      { ...created, variant_id: variantId },
    ])
    return { price: enriched }
  },
  async updatePrice(plid: string, input: Record<string, unknown>) {
    const db = getDb()
    const id = String(input.id)
    const amount = input.amount ?? 0
    const [updated] = await db
      .update(price)
      .set({
        currency_code: String(input.currency_code ?? "USD"),
        amount: String(amount),
        raw_amount: { amount, precision: 2 },
        updated_at: sql`now()`,
      })
      .where(
        and(
          eq(price.id, id),
          eq(price.price_list_id, plid),
          isNull(price.deleted_at),
        ),
      )
      .returning()
    if (!updated) throw new HTTPException(404, { message: "未找到" })

    await syncPriceRulesForPrice(
      db,
      id,
      input.rules as Record<string, string> | undefined,
    )

    const [enriched] = await enrichPriceListPrices([
      {
        ...updated,
        variant_id: input.variant_id,
      },
    ])
    return { price: enriched }
  },
  async remove(plid: string, pid: string) {
    const db = getDb()
    await db
      .update(price)
      .set({ deleted_at: sql`now()` })
      .where(and(eq(price.id, pid), eq(price.price_list_id, plid)))
    return { deleted: true, id: pid }
  },
  async linkProducts(plid: string, input: { product_ids?: string[]; productIds?: string[] }) {
    const db = getDb()
    const productIds = input.product_ids ?? input.productIds ?? []
    const linked: string[] = []

    for (const productId of productIds) {
      const ruleId = generateId("plr")
      await db.insert(priceListRule).values({
        id: ruleId,
        attribute: "product_id",
        value: productId,
        price_list_id: plid,
      })
      linked.push(productId)
    }

    const variants = productIds.length
      ? await db
          .select()
          .from(productVariant)
          .where(
            and(inArray(productVariant.product_id, productIds), isNull(productVariant.deleted_at)),
          )
      : []

    return { products: linked, variant_count: variants.length }
  },
  async batchPrices(
    plid: string,
    input: {
      prices?: Array<Record<string, unknown>>
      create?: Array<Record<string, unknown>>
      update?: Array<Record<string, unknown>>
      delete?: string[]
    },
  ) {
    const created: unknown[] = []
    const updated: unknown[] = []

    for (const id of input.delete ?? []) {
      await this.remove(plid, String(id))
    }

    for (const row of input.update ?? []) {
      const res = await this.updatePrice(plid, row)
      updated.push(res.price)
    }

    const createRows = input.prices ?? input.create ?? []
    for (const row of createRows) {
      const res = await this.add(plid, row)
      created.push(res.price)
    }

    return {
      created,
      updated,
      deleted: (input.delete ?? []).map((id) => ({ id })),
    }
  },
}

export const fulfillmentProviderService = {
  async list(query?: AdminFulfillmentProvidersParamsType) {
    const db = getDb()
    const rows = await db.select().from(fulfillmentProvider)

    const stockLocationId =
      typeof query?.stock_location_id === "string"
        ? query.stock_location_id
        : undefined
    if (stockLocationId) {
      const links = await db
        .select({
          fulfillment_provider_id:
            locationFulfillmentProvider.fulfillment_provider_id,
        })
        .from(locationFulfillmentProvider)
        .where(
          eq(locationFulfillmentProvider.stock_location_id, stockLocationId),
        )
      const linkedIds = new Set(
        links.map((l) => l.fulfillment_provider_id),
      )
      const fulfillment_providers = rows.filter((row) =>
        linkedIds.has(row.id),
      )
      return { fulfillment_providers, count: fulfillment_providers.length }
    }

    return { fulfillment_providers: rows, count: rows.length }
  },
  async listOptions(id: string) {
    return {
      fulfillment_options: [
        {
          id: `${id}_manual`,
          name: "Manual fulfillment",
          provider_id: id,
        },
      ],
    }
  },
}

export const fulfillmentSetService = { list: mkl(fulfillmentSet, "fulfillment_sets"), getById: mkg(fulfillmentSet, "fulfillment_sets"), create: mkc(fulfillmentSet, "fs", "fulfillment_sets"), update: mku(fulfillmentSet, "fulfillment_sets"), delete: mkdel(fulfillmentSet) }
