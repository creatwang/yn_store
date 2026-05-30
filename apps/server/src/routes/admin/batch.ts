import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { sql, eq } from "drizzle-orm"
import { generateId, getDb, stockLocation } from "@my-store/db"
import { adminAuth, type AuthVariables } from "../../middleware/auth"
import {
  categoryService, collectionService, customerGroupService, priceListService, taxRateService,
  inventoryItemService, reservationService, stockLocationService,
  shippingProfileService, shippingOptionTypeService, currencyService,
  promotionService, campaignService, apiKeyService, notificationService,
  workflowExecutionService, shippingOptionService, pricePreferenceService,
  propertyLabelService,
  paymentCollectionService,
  inventoryLevelService, priceListPriceService, fulfillmentSetService,
  fulfillmentProviderService,
} from "../../services/batch.service"
import { serviceZoneService } from "../../services/service-zone.service"

// 通用路由工厂
function crudRoutes(entity: string, svc: any) {
  return new Hono<{ Variables: AuthVariables }>()
    .use("*", adminAuth)
    .get("/", async (c) => {
      const q = c.req.query()
      const result = await svc.list({ limit: Number(q.limit) || 50, offset: Number(q.offset) || 0 })
      return c.json(result)
    })
    .get("/:id", async (c) => {
      const result = await svc.getById(c.req.param("id"))
      return c.json(result)
    })
    .post("/", async (c) => {
      const body = await c.req.json()
      const result = await svc.create(body)
      return c.json(result, 201)
    })
    .post("/:id", async (c) => {
      const body = await c.req.json()
      const result = await svc.update(c.req.param("id"), body)
      return c.json(result)
    })
    .delete("/:id", async (c) => {
      const result = await svc.delete(c.req.param("id"))
      return c.json(result)
    })
}

export const adminCategories = crudRoutes("categories", categoryService)
export const adminCollections = crudRoutes("collections", collectionService)
export const adminCustomerGroups = crudRoutes("customer-groups", customerGroupService)
export const adminPriceLists = crudRoutes("price-lists", priceListService)
export const adminTaxRates = crudRoutes("tax-rates", taxRateService)
export const adminReservations = crudRoutes("reservations", reservationService)
export const adminShippingProfiles = crudRoutes("shipping-profiles", shippingProfileService)
export const adminShippingOptionTypes = crudRoutes("shipping-option-types", shippingOptionTypeService)

// ── Inventory Items (full CRUD) ──────────────────────────
export const adminInventoryItemsFull = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => {
    const q = c.req.query()
    const result = await inventoryItemService.list({ limit: Number(q.limit) || 50, offset: Number(q.offset) || 0 })
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await inventoryItemService.getById(c.req.param("id"))
    return c.json(result)
  })
  .post("/", async (c) => {
    const body = await c.req.json()
    const result = await inventoryItemService.create(body)
    return c.json(result, 201)
  })
  .post("/:id", async (c) => {
    const body = await c.req.json()
    const result = await inventoryItemService.update(c.req.param("id"), body)
    return c.json(result)
  })
  .delete("/:id", async (c) => {
    const result = await inventoryItemService.delete(c.req.param("id"))
    return c.json(result)
  })
  .get("/:id/location-levels", async (c) => {
    const result = await inventoryItemService.listLevels(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/location-levels/batch", async (c) => {
    const body = await c.req.json()
    const result = await inventoryLevelService.batch(body)
    return c.json(result)
  })

// ── Stock Locations (full CRUD) ─────────────────────────
export const adminStockLocationsFull = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => {
    const q = c.req.query()
    const result = await stockLocationService.list({ limit: Number(q.limit) || 50, offset: Number(q.offset) || 0 })
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await stockLocationService.getById(c.req.param("id"))
    return c.json(result)
  })
  .post("/", async (c) => {
    const body = await c.req.json()
    const result = await stockLocationService.create(body)
    return c.json(result, 201)
  })
  .post("/:id", async (c) => {
    const body = await c.req.json()
    const result = await stockLocationService.update(c.req.param("id"), body)
    return c.json(result)
  })
  .delete("/:id", async (c) => {
    const result = await stockLocationService.delete(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/fulfillment-sets", async (c) => {
    const body = await c.req.json()
    const result = await fulfillmentSetService.create({
      ...body,
      metadata: { ...(body.metadata ?? {}), location_id: c.req.param("id") },
    })
    return c.json(result, 201)
  })
  .post("/:id/fulfillment-providers", async (c) => {
    const body = await c.req.json()
    const result = await stockLocationService.updateFulfillmentProviders(c.req.param("id"), body)
    return c.json(result)
  })
  .post("/:id/sales-channels", async (c) => {
    const body = await c.req.json()
    const result = await stockLocationService.updateSalesChannels(c.req.param("id"), body)
    return c.json(result)
  })

// ── Currencies (read-only) ──────────────────────────────
export const adminCurrencies = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => {
    const result = await currencyService.list()
    return c.json(result)
  })
  .get("/:code", async (c) => {
    const result = await currencyService.getByCode(c.req.param("code"))
    return c.json(result)
  })

export const adminPromotions = crudRoutes("promotions", promotionService)
export const adminCampaigns = crudRoutes("campaigns", campaignService)
export const adminApiKeys = crudRoutes("api-keys", apiKeyService)
export const adminNotifications = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => {
    const q = c.req.query()
    const result = await notificationService.list({ limit: Number(q.limit) || 50, offset: Number(q.offset) || 0 })
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await notificationService.getById(c.req.param("id"))
    return c.json(result)
  })
export const adminWorkflowExecutions = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => {
    const q = c.req.query()
    const result = await workflowExecutionService.list({ limit: Number(q.limit) || 50, offset: Number(q.offset) || 0 })
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await workflowExecutionService.getById(c.req.param("id"))
    return c.json(result)
  })
export const adminShippingOptions = crudRoutes("shipping-options", shippingOptionService)
export const adminPricePreferences = crudRoutes("price-preferences", pricePreferenceService)
export const adminPropertyLabels = crudRoutes("property-labels", propertyLabelService)
export const adminPaymentCollections = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => {
    const q = c.req.query()
    const result = await paymentCollectionService.list({ limit: Number(q.limit) || 50, offset: Number(q.offset) || 0 })
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await paymentCollectionService.getById(c.req.param("id"))
    return c.json(result)
  })

// ── Inventory Levels (sub-route) ───────────────────────
export const adminInventoryLevels = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => { const iid = c.req.param("iid")!; const r = await inventoryLevelService.list(iid); return c.json(r) })
  .get("/:lid", async (c) => {
    const iid = c.req.param("iid")!
    const lid = c.req.param("lid")!
    const r = await inventoryLevelService.list(iid)
    const level = (r.inventory_levels ?? r.levels ?? []).find((l: { location_id: string }) => l.location_id === lid)
    if (!level) return c.json({ message: "未找到" }, 404)
    return c.json({ inventory_level: level })
  })
  .post("/", async (c) => { const iid = c.req.param("iid")!; const b = await c.req.json(); const r = await inventoryLevelService.update(iid, b.location_id ?? b.locationId, b); return c.json(r) })
  .delete("/:lid", async (c) => { const r = await inventoryLevelService.delete(c.req.param("iid")!, c.req.param("lid")!); return c.json(r) })

// ── Price List Prices (sub-route) ──────────────────────
export const adminPriceListPrices = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => { const plid = c.req.param("plid")!; const r = await priceListPriceService.list(plid); return c.json(r) })
  .post("/", async (c) => { const plid = c.req.param("plid")!; const b = await c.req.json(); const r = await priceListPriceService.add(plid, b); return c.json(r, 201) })
  .delete("/:pid", async (c) => { const r = await priceListPriceService.remove(c.req.param("plid")!, c.req.param("pid")!); return c.json(r) })

// ── Fulfillment Sets + Service Zones ───────────────────
export const adminFulfillmentSets = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => {
    const q = c.req.query()
    const result = await fulfillmentSetService.list({ limit: Number(q.limit) || 50, offset: Number(q.offset) || 0 })
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await fulfillmentSetService.getById(c.req.param("id"))
    return c.json(result)
  })
  .post("/", async (c) => {
    const body = await c.req.json()
    const result = await fulfillmentSetService.create(body)
    return c.json(result, 201)
  })
  .post("/:id", async (c) => {
    const body = await c.req.json()
    const result = await fulfillmentSetService.update(c.req.param("id"), body)
    return c.json(result)
  })
  .delete("/:id", async (c) => {
    const result = await fulfillmentSetService.delete(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/service-zones", async (c) => {
    const body = await c.req.json()
    const result = await serviceZoneService.create(c.req.param("id"), body)
    return c.json(result, 201)
  })
  .get("/:id/service-zones/:zoneId", async (c) => {
    const result = await serviceZoneService.retrieve(c.req.param("id"), c.req.param("zoneId"))
    return c.json(result)
  })
  .post("/:id/service-zones/:zoneId", async (c) => {
    const body = await c.req.json()
    const result = await serviceZoneService.update(c.req.param("id"), c.req.param("zoneId"), body)
    return c.json(result)
  })
  .delete("/:id/service-zones/:zoneId", async (c) => {
    const result = await serviceZoneService.delete(c.req.param("id"), c.req.param("zoneId"))
    return c.json(result)
  })

// ── Link Products (CAT-001/SC-001) ──────────────────────
export const adminCategoryLinkProducts = new Hono<{ Variables: AuthVariables }>().use("*", adminAuth).post("/", async (c) => {
  const db = getDb(); const id = c.req.param("id")!; const b = await c.req.json(); const pids: string[] = b.product_ids || b.productIds || []
  await db.execute(sql`DELETE FROM product_category_product WHERE product_category_id = ${id}`)
  for (const pid of pids) await db.execute(sql`INSERT INTO product_category_product (product_id, product_category_id) VALUES (${pid}, ${id})`)
  return c.json({ success: true })
})
export const adminSalesChannelLinkProducts = new Hono<{ Variables: AuthVariables }>().use("*", adminAuth).post("/", async (c) => {
  const db = getDb(); const id = c.req.param("id")!; const b = await c.req.json(); const pids: string[] = b.product_ids || b.productIds || []
  await db.execute(sql`DELETE FROM product_sales_channel WHERE sales_channel_id = ${id}`)
  for (const pid of pids) await db.execute(sql`INSERT INTO product_sales_channel (id, product_id, sales_channel_id) VALUES (${generateId("psc")}, ${pid}, ${id})`)
  return c.json({ success: true })
})

export const adminCollectionLinkProducts = new Hono<{ Variables: AuthVariables }>().use("*", adminAuth).post("/", async (c) => {
  const db = getDb(); const id = c.req.param("id")!; const b = await c.req.json(); const pids = b.product_ids || b.productIds || []
  for (const pid of pids) {
    await db.execute(sql`UPDATE product SET collection_id = ${id} WHERE id = ${pid} AND deleted_at IS NULL`)
  }
  return c.json({ success: true })
})

export const adminPriceListLinkProducts = new Hono<{ Variables: AuthVariables }>().use("*", adminAuth).post("/", async (c) => {
  const plid = c.req.param("id")!
  const body = await c.req.json()
  const result = await priceListPriceService.linkProducts(plid, body)
  return c.json(result)
})
export const adminPriceListBatchPrices = new Hono<{ Variables: AuthVariables }>().use("*", adminAuth).post("/", async (c) => {
  const plid = c.req.param("id")!
  const body = await c.req.json()
  const result = await priceListPriceService.batchPrices(plid, body)
  return c.json(result)
})

export const adminInventoryBatchLevels = new Hono<{ Variables: AuthVariables }>().use("*", adminAuth).post("/", async (c) => {
  const body = await c.req.json()
  const result = await inventoryLevelService.batch(body)
  return c.json(result)
})

export const adminFulfillmentProviders = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => {
    const query = Object.fromEntries(new URL(c.req.url).searchParams.entries())
    const result = await fulfillmentProviderService.list(query)
    return c.json(result)
  })
  .get("/:id/options", async (c) => {
    const result = await fulfillmentProviderService.listOptions(c.req.param("id"))
    return c.json(result)
  })
