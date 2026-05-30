import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm"
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
  reservationItem,
  stockLocation,
  shippingProfile,
  shippingOptionType,
  currency,
  promotion,
  promotionCampaign,
  apiKey,
  notification,
  workflowExecution,
  shippingOption,
  pricePreference,
  propertyLabel,
  paymentCollection,
  fulfillmentSet,
  fulfillmentProvider,
} from "@my-store/db"
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
  async list() {
    const db = getDb()
    const rows = await db.select().from(fulfillmentProvider)
    return { fulfillment_providers: rows, count: rows.length }
  },
  async listOptions(_id: string) {
    return { fulfillment_options: [] }
  },
}

export const fulfillmentSetService = { list: mkl(fulfillmentSet, "fulfillment_sets"), getById: mkg(fulfillmentSet, "fulfillment_sets"), create: mkc(fulfillmentSet, "fs", "fulfillment_sets"), update: mku(fulfillmentSet, "fulfillment_sets"), delete: mkdel(fulfillmentSet) }
