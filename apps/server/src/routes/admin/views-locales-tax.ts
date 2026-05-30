import { Hono } from "hono"
import { getDb, storeLocale, taxProvider } from "@my-store/db"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

/** 表格视图 — 返回空配置，避免 Admin 404；后续可接 custom_ 表 */
export const adminViews = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/:entity/columns", async (c) => {
    return c.json({ columns: [], count: 0, entity: c.req.param("entity") })
  })
  .get("/:entity/configurations", async (c) => {
    return c.json({ view_configurations: [], count: 0 })
  })
  .get("/:entity/configurations/active", async (c) => {
    return c.json({
      view_configuration: null,
      active_view_configuration_id: null,
      is_default_active: true,
      default_type: "system",
    })
  })
  .get("/:entity/configurations/:id", async (c) => {
    return c.json({ view_configuration: null }, 404)
  })
  .post("/:entity/configurations", async (c) => {
    const body = await c.req.json()
    return c.json({ view_configuration: { id: "view_stub", entity: c.req.param("entity"), ...body } }, 201)
  })
  .post("/:entity/configurations/:id", async (c) => {
    const body = await c.req.json()
    return c.json({ view_configuration: { id: c.req.param("id"), entity: c.req.param("entity"), ...body } })
  })
  .delete("/:entity/configurations/:id", async (c) => {
    return c.json({ id: c.req.param("id"), object: "view_configuration", deleted: true })
  })
  .post("/:entity/configurations/active", async (c) => {
    return c.json({ success: true })
  })

export const adminLocales = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => {
    const db = getDb()
    const rows = await db.select().from(storeLocale)
    const locales = rows.map((r) => ({
      code: r.locale_code,
      name: r.locale_code,
    }))
    return c.json({ locales, count: locales.length })
  })
  .get("/:code", async (c) => {
    const code = c.req.param("code")
    return c.json({ locale: { code, name: code } })
  })

export const adminTaxProviders = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => {
    const db = getDb()
    const rows = await db.select().from(taxProvider)
    const providers = rows.map((p) => ({ id: p.id, is_enabled: p.is_enabled }))
    return c.json({ tax_providers: providers, count: providers.length })
  })
