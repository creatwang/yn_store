import { and, count, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  productCategory,
  productCollection,
  customerGroup,
  priceList,
  price,
  priceListRule,
  productVariant,
  taxRate,
  inventoryItem,
  inventoryLevel,
  shippingProfile,
  shippingOptionType,
  currency,
  promotion,
  promotionCampaign,
  applicationMethod,
  promotionRule,
  promotionRuleValue,
  apiKey,
  notification,
  workflowExecution,
  pricePreference,
  propertyLabel,
  paymentCollection,
  fulfillmentSet,
  fulfillmentProvider,
  stockLocation,
} from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import type {
  AdminFulfillmentProvidersParamsType,
  AdminGetCollectionsParamsType,
  AdminGetInventoryItemsParamsType,
  AdminProductCategoriesParamsType,
} from "@my-store/validators/admin-list-params"
import {
  applyDateRangeConditions,
  asDateRange,
  listLimitOffset,
} from "../lib/query-filters"
import { stockLocationService, shippingOptionService } from "./stock-location.service"

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
function mkg(table: any, entityKey: string) {
  return async (id: string) => {
    const db = getDb()
    const [item] = await db.select().from(table).where(and(eq(table.id, id), isNull(table.deleted_at))).limit(1)
    if (!item) throw new HTTPException(404, { message: "未找到" })
    return { [entityKey.slice(0, -1)]: item }
  }
}
function mkc(table: any, prefix: string, entityKey: string) {
  return async (input: any) => {
    const db = getDb()
    const id = generateId(prefix)
    const [created] = await db.insert(table).values({ id, ...input, created_at: sql`now()`, updated_at: sql`now()` }).returning()
    return { [entityKey.slice(0, -1)]: created }
  }
}
function mku(table: any, entityKey: string) {
  return async (id: string, input: any) => {
    const db = getDb()
    const [updated] = await db.update(table).set({ ...input, updated_at: sql`now()` }).where(and(eq(table.id, id), isNull(table.deleted_at))).returning()
    if (!updated) throw new HTTPException(404, { message: "未找到" })
    return { [entityKey.slice(0, -1)]: updated }
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

// ── Price Lists ─────────────────────────────────────────────
export const priceListService = {
  list: mkl(priceList, "price_lists"),
  getById: mkg(priceList, "price_lists"),
  create: mkc(priceList, "plist", "price_lists"),
  update: mku(priceList, "price_lists"),
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
    const conditions = [isNull(inventoryItem.deleted_at)]

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

    const where = and(...conditions)
    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(inventoryItem)
        .where(where)
        .orderBy(desc(inventoryItem.created_at))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(inventoryItem).where(where),
    ])
    return {
      inventory_items: rows,
      count: Number(total),
      limit,
      offset,
    }
  },
  getById: mkg(inventoryItem, "inventory_items"),
  create: mkc(inventoryItem, "iitem", "inventory_items"),
  update: mku(inventoryItem, "inventory_items"),
  delete: mkdel(inventoryItem),
  async listLevels(inventoryItemId: string) {
    const db = getDb()
    const rows = await db.select().from(inventoryLevel).where(eq(inventoryLevel.inventory_item_id, inventoryItemId))
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
  list: mkl(promotion, "promotions"),
  getById: mkg(promotion, "promotions"),
  delete: mkdel(promotion),

  async create(input: Record<string, unknown>) {
    const db = getDb()
    const id = generateId("promo")
    const { application_method, rules, ...promoFields } = input
    const [created] = await db.insert(promotion).values({
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
    }).returning()

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
        currency_code: (am.currency_code as string | null | undefined) ?? null,
        max_quantity: (am.max_quantity as number | null | undefined) ?? null,
        apply_to_quantity: (am.apply_to_quantity as number | null | undefined) ?? null,
        buy_rules_min_quantity: (am.buy_rules_min_quantity as number | null | undefined) ?? null,
        description: (am.description as string | null) ?? null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })

      // Write target_rules / buy_rules into promotion_rule
      for (const key of ["target_rules", "buy_rules"]) {
        const ruleList = (am[key] as Array<Record<string, unknown>>) ?? []
        for (const r of ruleList) {
          const ruleId = generateId("prorul")
          await db.insert(promotionRule).values({
            id: ruleId,
            promotion_id: id,
            application_method_id: amId,
            attribute: String(r.attribute ?? ""),
            operator: String(r.operator ?? "eq"),
            description: (r.description as string | null) ?? null,
            created_at: sql`now()`,
            updated_at: sql`now()`,
          })
          const vals = (r.values ?? r.value) as string[] | string | undefined
          const valueList = Array.isArray(vals) ? vals : vals ? [vals] : []
          for (const v of valueList) {
            await db.insert(promotionRuleValue).values({
              id: generateId("prorulval"),
              promotion_rule_id: ruleId,
              value: String(v),
              created_at: sql`now()`,
              updated_at: sql`now()`,
            })
          }
        }
      }
    }

    // Write top-level rules
    const ruleList = (rules as Array<Record<string, unknown>>) ?? []
    for (const r of ruleList) {
      const ruleId = generateId("prorul")
      await db.insert(promotionRule).values({
        id: ruleId,
        promotion_id: id,
        attribute: String(r.attribute ?? ""),
        operator: String(r.operator ?? "eq"),
        description: (r.description as string | null) ?? null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      const vals = (r.values ?? r.value) as string[] | string | undefined
      const valueList = Array.isArray(vals) ? vals : vals ? [vals] : []
      for (const v of valueList) {
        await db.insert(promotionRuleValue).values({
          id: generateId("prorulval"),
          promotion_rule_id: ruleId,
          value: String(v),
          created_at: sql`now()`,
          updated_at: sql`now()`,
        })
      }
    }

    return { promotion: created }
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
          id: amId, promotion_id: id,
          type: String(am.type ?? "percentage"), target_type: String(am.target_type ?? "items"),
          allocation: (am.allocation as string) ?? "across",
          value: String(amValue), raw_value: { value: String(amValue), precision: 20 },
          currency_code: (am.currency_code as string | null) ?? null,
          max_quantity: (am.max_quantity as number | null) ?? null,
          apply_to_quantity: (am.apply_to_quantity as number | null) ?? null,
          buy_rules_min_quantity: (am.buy_rules_min_quantity as number | null) ?? null,
          description: (am.description as string | null) ?? null,
          created_at: sql`now()`, updated_at: sql`now()`,
        })
      }
    }

    // Replace rules if provided
    if (rules !== undefined) {
      // Delete existing rules + values
      const existingRules = await db.select().from(promotionRule).where(eq(promotionRule.promotion_id, id))
      for (const er of existingRules) {
        await db.delete(promotionRuleValue).where(eq(promotionRuleValue.promotion_rule_id, er.id))
      }
      await db.delete(promotionRule).where(eq(promotionRule.promotion_id, id))

      // Re-create
      const ruleList = rules as Array<Record<string, unknown>>
      for (const r of ruleList) {
        const ruleId = generateId("prorul")
        await db.insert(promotionRule).values({
          id: ruleId, promotion_id: id,
          attribute: String(r.attribute ?? ""), operator: String(r.operator ?? "eq"),
          description: (r.description as string | null) ?? null,
          created_at: sql`now()`, updated_at: sql`now()`,
        })
        const vals = (r.values ?? r.value) as string[] | string | undefined
        const valueList = Array.isArray(vals) ? vals : vals ? [vals] : []
        for (const v of valueList) {
          await db.insert(promotionRuleValue).values({
            id: generateId("prorulval"), promotion_rule_id: ruleId, value: String(v),
            created_at: sql`now()`, updated_at: sql`now()`,
          })
        }
      }
    }

    return { promotion: updated }
  },
}

// ── Campaigns ──────────────────────────────────────────────
export const campaignService = { list: mkl(promotionCampaign, "campaigns"), getById: mkg(promotionCampaign, "campaigns"), create: mkc(promotionCampaign, "camp", "campaigns"), update: mku(promotionCampaign, "campaigns"), delete: mkdel(promotionCampaign) }

// ── API Keys ───────────────────────────────────────────────
export const apiKeyService = { list: mkl(apiKey, "api_keys"), getById: mkg(apiKey, "api_keys"), create: mkc(apiKey, "ak", "api_keys"), update: mku(apiKey, "api_keys"), delete: mkdel(apiKey) }

// ── Notifications ──────────────────────────────────────────
export const notificationService = { list: mkl(notification, "notifications"), getById: mkg(notification, "notifications") }

// ── Workflow Executions ────────────────────────────────────
export const workflowExecutionService = { list: mkl(workflowExecution, "workflow_executions"), getById: mkg(workflowExecution, "workflow_executions") }

// ── Price Preferences ──────────────────────────────────────
export const pricePreferenceService = { list: mkl(pricePreference, "price_preferences"), getById: mkg(pricePreference, "price_preferences"), create: mkc(pricePreference, "ppref", "price_preferences"), update: mku(pricePreference, "price_preferences"), delete: mkdel(pricePreference) }

// ── Property Labels ────────────────────────────────────────
export const propertyLabelService = { list: mkl(propertyLabel, "property_labels"), getById: mkg(propertyLabel, "property_labels"), create: mkc(propertyLabel, "pl", "property_labels"), update: mku(propertyLabel, "property_labels"), delete: mkdel(propertyLabel) }

export const paymentCollectionService = { list: mkl(paymentCollection, "payment_collections"), getById: mkg(paymentCollection, "payment_collections") }

export const inventoryLevelService = {
  async list(iid: string) {
    const db = getDb()
    const rows = await db.select().from(inventoryLevel).where(eq(inventoryLevel.inventory_item_id, iid))
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
    return { inventory_level: u }
  },
  async delete(iid: string, lid: string) {
    const db = getDb()
    await db.delete(inventoryLevel).where(
      and(eq(inventoryLevel.inventory_item_id, iid), eq(inventoryLevel.location_id, lid)),
    )
    return { deleted: true }
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
      const id = generateId("ilev")
      const qty = row.stocked_quantity ?? 0
      const [c] = await db
        .insert(inventoryLevel)
        .values({
          id,
          inventory_item_id: row.inventory_item_id,
          location_id: row.location_id,
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
    return { prices: rows, count: rows.length }
  },
  async add(plid: string, input: any) {
    const db = getDb()
    const id = generateId("pr")
    const amount = input.amount ?? 0
    const [c] = await db
      .insert(price)
      .values({
        id,
        price_list_id: plid,
        currency_code: input.currency_code ?? "USD",
        amount: String(amount),
        raw_amount: { amount, precision: 2 },
        price_set_id: input.price_set_id ?? generateId("pset"),
        ...input,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning()
    return { price: c }
  },
  async remove(plid: string, pid: string) {
    const db = getDb()
    await db
      .update(price)
      .set({ deleted_at: sql`now()` })
      .where(and(eq(price.id, pid), eq(price.price_list_id, plid)))
    return { deleted: true }
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
    input: { prices?: Array<Record<string, unknown>>; create?: Array<Record<string, unknown>> },
  ) {
    const rows = input.prices ?? input.create ?? []
    const prices = []
    for (const row of rows) {
      const res = await this.add(plid, row)
      prices.push(res.price)
    }
    return { prices }
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
      const [loc] = await db
        .select()
        .from(stockLocation)
        .where(
          and(
            eq(stockLocation.id, stockLocationId),
            isNull(stockLocation.deleted_at),
          ),
        )
        .limit(1)
      const meta = (loc?.metadata ?? {}) as Record<string, unknown>
      const linkedIds = new Set(
        [
          ...(Array.isArray(meta.fulfillment_provider_ids) ? meta.fulfillment_provider_ids : []),
          ...(Array.isArray(meta.providerIds) ? meta.providerIds : []),
          ...(Array.isArray(meta.fulfillmentProviderIds) ? meta.fulfillmentProviderIds : []),
        ].map(String),
      )
      const fulfillment_providers = rows.filter((row) => linkedIds.has(row.id))
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
