import { and, count, desc, eq, isNull, sql } from "drizzle-orm"
import { generateId, getDb, productCategory, productCollection, customerGroup, priceList, taxRate, inventoryItem, inventoryLevel, reservationItem, stockLocation, shippingProfile, shippingOptionType, currency, promotion, promotionCampaign, apiKey, notification, workflowExecution, shippingOption, pricePreference, propertyLabel, paymentCollection } from "@my-store/db"
import { HTTPException } from "hono/http-exception"

function mkl(table: any, entityKey: string) {
  return async (query: { limit: number; offset: number }) => {
    const db = getDb()
    const where = isNull(table.deleted_at)
    const [rows, [{ total }]] = await Promise.all([
      db.select().from(table).where(where).orderBy(desc(table.created_at)).limit(query.limit).offset(query.offset),
      db.select({ total: count() }).from(table).where(where),
    ])
    return { [entityKey]: rows, count: Number(total), limit: query.limit, offset: query.offset }
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

// ── Categories ─────────────────────────────────────────────
export const categoryService = {
  list: mkl(productCategory, "product_categories"),
  getById: mkg(productCategory, "product_categories"),
  create: mkc(productCategory, "pcat", "product_categories"),
  update: mku(productCategory, "product_categories"),
  delete: mkdel(productCategory),
}

// ── Collections ─────────────────────────────────────────────
export const collectionService = {
  list: mkl(productCollection, "collections"),
  getById: mkg(productCollection, "collections"),
  create: mkc(productCollection, "pcol", "collections"),
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
  list: mkl(inventoryItem, "inventory_items"),
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

// ── Reservations ────────────────────────────────────────────
export const reservationService = {
  list: mkl(reservationItem, "reservations"),
  getById: mkg(reservationItem, "reservations"),
  create: mkc(reservationItem, "res", "reservations"),
  update: mku(reservationItem, "reservations"),
  delete: mkdel(reservationItem),
}

// ── Stock Locations ─────────────────────────────────────────
export const stockLocationService = {
  list: mkl(stockLocation, "stock_locations"),
  getById: mkg(stockLocation, "stock_locations"),
  create: mkc(stockLocation, "sloc", "stock_locations"),
  update: mku(stockLocation, "stock_locations"),
  delete: mkdel(stockLocation),
}

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
export const promotionService = { list: mkl(promotion, "promotions"), getById: mkg(promotion, "promotions"), create: mkc(promotion, "promo", "promotions"), update: mku(promotion, "promotions"), delete: mkdel(promotion) }

// ── Campaigns ──────────────────────────────────────────────
export const campaignService = { list: mkl(promotionCampaign, "campaigns"), getById: mkg(promotionCampaign, "campaigns"), create: mkc(promotionCampaign, "camp", "campaigns"), update: mku(promotionCampaign, "campaigns"), delete: mkdel(promotionCampaign) }

// ── API Keys ───────────────────────────────────────────────
export const apiKeyService = { list: mkl(apiKey, "api_keys"), getById: mkg(apiKey, "api_keys"), create: mkc(apiKey, "ak", "api_keys"), update: mku(apiKey, "api_keys"), delete: mkdel(apiKey) }

// ── Notifications ──────────────────────────────────────────
export const notificationService = { list: mkl(notification, "notifications"), getById: mkg(notification, "notifications") }

// ── Workflow Executions ────────────────────────────────────
export const workflowExecutionService = { list: mkl(workflowExecution, "workflow_executions"), getById: mkg(workflowExecution, "workflow_executions") }

// ── Shipping Options ───────────────────────────────────────
export const shippingOptionService = { list: mkl(shippingOption, "shipping_options"), getById: mkg(shippingOption, "shipping_options"), create: mkc(shippingOption, "so", "shipping_options"), update: mku(shippingOption, "shipping_options"), delete: mkdel(shippingOption) }

// ── Price Preferences ──────────────────────────────────────
export const pricePreferenceService = { list: mkl(pricePreference, "price_preferences"), getById: mkg(pricePreference, "price_preferences"), create: mkc(pricePreference, "ppref", "price_preferences"), update: mku(pricePreference, "price_preferences"), delete: mkdel(pricePreference) }

// ── Property Labels ────────────────────────────────────────
export const propertyLabelService = { list: mkl(propertyLabel, "property_labels"), getById: mkg(propertyLabel, "property_labels"), create: mkc(propertyLabel, "pl", "property_labels"), update: mku(propertyLabel, "property_labels"), delete: mkdel(propertyLabel) }

export const paymentCollectionService = { list: mkl(paymentCollection, "payment_collections"), getById: mkg(paymentCollection, "payment_collections") }
