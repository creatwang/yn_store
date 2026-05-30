import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { adminAuth, type AuthVariables } from "../../middleware/auth"
import {
  categoryService, collectionService, customerGroupService, priceListService, taxRateService,
  inventoryItemService, reservationService, stockLocationService,
  shippingProfileService, shippingOptionTypeService, currencyService,
  promotionService, campaignService, apiKeyService, notificationService,
  workflowExecutionService, shippingOptionService, pricePreferenceService,
  propertyLabelService,
  paymentCollectionService,
} from "../../services/batch.service"

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
