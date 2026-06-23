import { Hono } from "hono"
import { eq, and, isNull, desc } from "drizzle-orm"
import { generateId, getDb, viewConfiguration, taxProvider } from "@my-store/db"
import { adminAuth, type AuthVariables } from "../../middleware/auth"
import { translationService } from "../../services/translation.service"

/** 表格视图 — 读写 view_configuration 表，支持列配置持久化 */
export const adminViews = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  // GET /:entity/columns — 返回该实体的表格列配置
  .get("/:entity/columns", async (c) => {
    const entity = c.req.param("entity")
    const db = getDb()
    const rows = await db
      .select()
      .from(viewConfiguration)
      .where(
        and(
          eq(viewConfiguration.entity, entity),
          eq(viewConfiguration.is_system_default, true),
          isNull(viewConfiguration.deleted_at),
        ),
      )
      .orderBy(desc(viewConfiguration.updated_at))
      .limit(1)

    const config = rows[0]
    const columns = (config?.configuration as any)?.columns ?? []
    return c.json({ columns, count: columns.length, entity })
  })
  // GET /:entity/configurations — 列出该实体的所有视图配置
  .get("/:entity/configurations", async (c) => {
    const entity = c.req.param("entity")
    const db = getDb()
    const rows = await db
      .select()
      .from(viewConfiguration)
      .where(
        and(
          eq(viewConfiguration.entity, entity),
          isNull(viewConfiguration.deleted_at),
        ),
      )
      .orderBy(desc(viewConfiguration.updated_at))

    const configs = rows.map((r) => ({
      id: r.id,
      entity: r.entity,
      name: r.name ?? "默认视图",
      is_system_default: r.is_system_default,
      configuration: r.configuration,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }))
    return c.json({ view_configurations: configs, count: configs.length })
  })
  // GET /:entity/configurations/active — 返回活跃配置
  .get("/:entity/configurations/active", async (c) => {
    const entity = c.req.param("entity")
    const db = getDb()
    const rows = await db
      .select()
      .from(viewConfiguration)
      .where(
        and(
          eq(viewConfiguration.entity, entity),
          eq(viewConfiguration.is_system_default, true),
          isNull(viewConfiguration.deleted_at),
        ),
      )
      .orderBy(desc(viewConfiguration.updated_at))
      .limit(1)

    if (rows[0]) {
      return c.json({
        view_configuration: {
          id: rows[0].id,
          entity: rows[0].entity,
          name: rows[0].name,
          configuration: rows[0].configuration,
        },
        active_view_configuration_id: rows[0].id,
        is_default_active: rows[0].is_system_default,
        default_type: rows[0].is_system_default ? "system" : "custom",
      })
    }

    return c.json({
      view_configuration: null,
      active_view_configuration_id: null,
      is_default_active: true,
      default_type: "system",
    })
  })
  // GET /:entity/configurations/:id — 单个配置详情
  .get("/:entity/configurations/:id", async (c) => {
    const { entity, id } = c.req.param()
    const db = getDb()
    const [row] = await db
      .select()
      .from(viewConfiguration)
      .where(
        and(
          eq(viewConfiguration.id, id),
          eq(viewConfiguration.entity, entity),
          isNull(viewConfiguration.deleted_at),
        ),
      )
      .limit(1)

    if (!row) {
      return c.json({ view_configuration: null }, 404)
    }
    return c.json({
      view_configuration: {
        id: row.id,
        entity: row.entity,
        name: row.name,
        configuration: row.configuration,
      },
    })
  })
  // POST /:entity/configurations — 创建视图配置
  .post("/:entity/configurations", async (c) => {
    const entity = c.req.param("entity")
    const body = await c.req.json()
    const db = getDb()
    const id = generateId("viewcfg")

    await db.insert(viewConfiguration).values({
      id,
      entity,
      name: body.name ?? null,
      user_id: body.user_id ?? null,
      is_system_default: body.is_system_default ?? false,
      configuration: body.configuration ?? body,
    })

    return c.json(
      {
        view_configuration: { id, entity, name: body.name, configuration: body.configuration },
      },
      201,
    )
  })
  // POST /:entity/configurations/:id — 更新视图配置
  .post("/:entity/configurations/:id", async (c) => {
    const { entity, id } = c.req.param()
    const body = await c.req.json()
    const db = getDb()

    await db
      .update(viewConfiguration)
      .set({
        name: body.name,
        configuration: body.configuration ?? body,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(viewConfiguration.id, id),
          eq(viewConfiguration.entity, entity),
        ),
      )

    return c.json({
      view_configuration: { id, entity, name: body.name, configuration: body.configuration },
    })
  })
  // DELETE /:entity/configurations/:id — 软删视图配置
  .delete("/:entity/configurations/:id", async (c) => {
    const { entity, id } = c.req.param()
    const db = getDb()

    await db
      .update(viewConfiguration)
      .set({ deleted_at: new Date() })
      .where(
        and(
          eq(viewConfiguration.id, id),
          eq(viewConfiguration.entity, entity),
        ),
      )

    return c.json({ id, object: "view_configuration", deleted: true })
  })
  // POST /:entity/configurations/active — 设为活跃配置
  .post("/:entity/configurations/active", async (c) => {
    const entity = c.req.param("entity")
    const body = await c.req.json()
    const db = getDb()

    // 先将该 entity 所有配置的 is_system_default 设为 false
    await db
      .update(viewConfiguration)
      .set({ is_system_default: false })
      .where(eq(viewConfiguration.entity, entity))

    // 如果指定了 id，激活该配置
    if (body.active_view_configuration_id) {
      await db
        .update(viewConfiguration)
        .set({ is_system_default: true, updated_at: new Date() })
        .where(
          and(
            eq(viewConfiguration.id, body.active_view_configuration_id),
            eq(viewConfiguration.entity, entity),
          ),
        )
    }

    return c.json({ success: true })
  })

export const adminLocales = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => {
    const code = c.req.query("code")
    const codes = code
      ? (Array.isArray(code) ? code : code.split(",")).map((v) => v.trim()).filter(Boolean)
      : undefined
    return c.json(translationService.listCatalogLocales(codes))
  })
  .get("/:code", async (c) => {
    const code = c.req.param("code")
    const { locales } = translationService.listCatalogLocales([code])
    const locale = locales[0] ?? { code, name: code }
    return c.json({ locale })
  })

export const adminTaxProviders = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => {
    const db = getDb()
    const rows = await db.select().from(taxProvider)
    const providers = rows.map((p) => ({ id: p.id, is_enabled: p.is_enabled }))
    return c.json({ tax_providers: providers, count: providers.length })
  })
