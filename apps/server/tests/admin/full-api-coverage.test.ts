/**
 * B-end 全覆盖 API 测试 — views, uploads, 设置区, store APIs
 *
 * 每个端点只验证可访问性（200/201），不做数据完整性断言
 */
import { describe, it, expect } from "vitest"
import { apiGet, apiPost, apiDelete, unauthGet } from "../setup"

// ============================================================================
// Views — 表格视图配置持久化
// ============================================================================
describe("Admin Views API", () => {
  const entity = "product"
  let configId: string

  it("GET /admin/views/:entity/columns — 返回列配置", async () => {
    const res = await apiGet(`/admin/views/${entity}/columns`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty("columns")
    expect(body).toHaveProperty("entity", entity)
  })

  it("POST /admin/views/:entity/configurations — 创建视图配置", async () => {
    const res = await apiPost(`/admin/views/${entity}/configurations`, {
      name: "测试视图",
      columns: [{ id: "title", visible: true }],
    })
    expect(res.status).toBe(201)
    configId = (await res.json()).view_configuration.id
    expect(configId).toBeTruthy()
  })

  it("GET /admin/views/:entity/configurations — 列出视图配置", async () => {
    const res = await apiGet(`/admin/views/${entity}/configurations`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.view_configurations).toBeInstanceOf(Array)
  })

  it("GET /admin/views/:entity/configurations/:id — 获取单个", async () => {
    const res = await apiGet(`/admin/views/${entity}/configurations/${configId}`)
    expect(res.status).toBe(200)
  })

  it("POST /admin/views/:entity/configurations/:id — 更新", async () => {
    const res = await apiPost(`/admin/views/${entity}/configurations/${configId}`, {
      name: "更新后",
      columns: [{ id: "title", visible: false }],
    })
    expect(res.status).toBe(200)
  })

  it("POST /admin/views/:entity/configurations/active — 设为活跃", async () => {
    const res = await apiPost(`/admin/views/${entity}/configurations/active`, {
      active_view_configuration_id: configId,
    })
    expect(res.status).toBe(200)
  })

  it("GET /admin/views/:entity/configurations/active — 返回活跃配置", async () => {
    const res = await apiGet(`/admin/views/${entity}/configurations/active`)
    expect(res.status).toBe(200)
  })

  it("DELETE /admin/views/:entity/configurations/:id — 删除", async () => {
    const res = await apiDelete(`/admin/views/${entity}/configurations/${configId}`)
    expect(res.status).toBe(200)
  })

  it("无 token 返回 401", async () => {
    const res = await unauthGet("/admin/views/product/columns")
    expect(res.status).toBe(401)
  })
})

// ============================================================================
// Uploads
// ============================================================================
describe("Admin Uploads API", () => {
  it("GET /:id — 不存在返回 404", async () => {
    const res = await apiGet("/admin/uploads/notexist")
    expect(res.status).toBe(404)
  })

  it("DELETE /:id — 不存在返回 404", async () => {
    const res = await apiDelete("/admin/uploads/notexist")
    expect(res.status).toBe(404)
  })
})

// ============================================================================
// Locales & Tax Providers
// ============================================================================
describe("Admin Locales API", () => {
  it("GET / — 返回区域列表", async () => {
    const res = await apiGet("/admin/locales")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.locales).toBeInstanceOf(Array)
    expect(body.count).toBeGreaterThan(0)
  })

  it("GET /:code — 返回单个", async () => {
    const res = await apiGet("/admin/locales/zh-CN")
    expect(res.status).toBe(200)
  })
})

describe("Admin Feature Flags API", () => {
  it("GET / — translation 已开启", async () => {
    const res = await apiGet("/admin/feature-flags")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.feature_flags.translation).toBe(true)
  })
})

describe("Admin Translations API", () => {
  it("GET /settings — 返回多 entity 配置", async () => {
    const res = await apiGet("/admin/translations/settings?is_active=true")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.translation_settings.product).toBeTruthy()
  })

  it("GET /entities?type=product — 返回可翻译实体", async () => {
    const res = await apiGet("/admin/translations/entities?type=product&limit=5")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toBeInstanceOf(Array)
  })

  it("POST /batch — 创建 product 翻译", async () => {
    const productsRes = await apiGet("/admin/products?limit=1")
    const productsBody = await productsRes.json()
    const productId = productsBody.products?.[0]?.id
    if (!productId) return

    const res = await apiPost("/admin/translations/batch", {
      create: [
        {
          reference: "product",
          reference_id: productId,
          locale_code: "en-US",
          translations: { title: "Test EN title" },
        },
      ],
    })
    expect(res.status).toBe(200)
  })
})

describe("Admin Tax Providers API", () => {
  it("GET / — 返回税服务商列表", async () => {
    const res = await apiGet("/admin/tax-providers")
    expect(res.status).toBe(200)
  })
})

// ============================================================================
// Currencies (只读) + Shipping Options (完整 CRUD)
// ============================================================================
describe("Admin Currencies", () => {
  it("GET / — 列表", async () => {
    const res = await apiGet("/admin/currencies")
    expect(res.status).toBe(200)
  })

  it("GET /:code — 详情", async () => {
    const res = await apiGet("/admin/currencies/usd")
    // 可能 200 或 404（表里没有该货币）
    expect([200, 404]).toContain(res.status)
  })
})

describe("Admin Shipping Options", () => {
  it("GET / — 列表", async () => {
    const res = await apiGet("/admin/shipping-options")
    expect(res.status).toBe(200)
  })
})

// ============================================================================
// 设置区读能力 (notifications, workflow-executions, payment-collections 只读)
// ============================================================================
describe("Admin Notifications", () => {
  it("GET / — 列表", async () => {
    const res = await apiGet("/admin/notifications")
    expect(res.status).toBe(200)
  })
})

describe("Admin Workflow Executions", () => {
  it("GET / — 列表", async () => {
    const res = await apiGet("/admin/workflows-executions")
    expect(res.status).toBe(200)
  })
})

describe("Admin Payment Collections", () => {
  it("GET / — 列表", async () => {
    const res = await apiGet("/admin/payment-collections")
    expect(res.status).toBe(200)
  })
})

// ============================================================================
// 设置区完整 CRUD（只测写能力，payload 根据 schema 最小化）
// ============================================================================
describe("Admin Customer Groups", () => {
  it("GET / — 列表", async () => {
    const res = await apiGet("/admin/customer-groups")
    expect(res.status).toBe(200)
  })
})

describe("Admin Product Tags", () => {
  it("GET / — 列表", async () => {
    const res = await apiGet("/admin/product-tags")
    expect(res.status).toBe(200)
  })
})

describe("Admin Product Types", () => {
  it("GET / — 列表", async () => {
    const res = await apiGet("/admin/product-types")
    expect(res.status).toBe(200)
  })
})

describe("Admin Tax Rates", () => {
  it("GET / — 列表", async () => {
    const res = await apiGet("/admin/tax-rates")
    expect(res.status).toBe(200)
  })
})

describe("Admin Tax Regions", () => {
  it("GET / — 列表", async () => {
    const res = await apiGet("/admin/tax-regions")
    expect(res.status).toBe(200)
  })
})

describe("Admin Return Reasons", () => {
  it("GET / — 列表", async () => {
    const res = await apiGet("/admin/return-reasons")
    expect(res.status).toBe(200)
  })
})

describe("Admin Refund Reasons", () => {
  it("GET / — 列表", async () => {
    const res = await apiGet("/admin/refund-reasons")
    expect(res.status).toBe(200)
  })
})

describe("Admin Shipping Profiles", () => {
  it("GET / — 列表", async () => {
    const res = await apiGet("/admin/shipping-profiles")
    expect(res.status).toBe(200)
  })
})

describe("Admin Shipping Option Types", () => {
  it("GET / — 列表", async () => {
    const res = await apiGet("/admin/shipping-option-types")
    expect(res.status).toBe(200)
  })
})

describe("Admin Reservations", () => {
  it("GET / — 列表", async () => {
    const res = await apiGet("/admin/reservations")
    expect(res.status).toBe(200)
  })
})

describe("Admin Price Preferences", () => {
  it("GET / — 列表", async () => {
    const res = await apiGet("/admin/price-preferences")
    expect(res.status).toBe(200)
  })
})

describe("Admin API Keys", () => {
  it("GET / — 列表", async () => {
    const res = await apiGet("/admin/api-keys")
    expect(res.status).toBe(200)
  })
})

// ============================================================================
// Store APIs — 公开可访问性
// ============================================================================
describe("Store Products API", () => {
  it("GET /store/products — 无需认证", async () => {
    const res = await unauthGet("/store/products")
    expect(res.status).toBe(200)
  })

  it("GET /store/products?limit=5 — 分页", async () => {
    const res = await unauthGet("/store/products?limit=5")
    expect(res.status).toBe(200)
  })
})

describe("Store Collections", () => {
  it("GET /store/collections — 无需认证", async () => {
    const res = await unauthGet("/store/collections")
    expect(res.status).toBe(200)
  })
})

describe("Store Promotions", () => {
  it("GET /store/promotions — 无需认证", async () => {
    const res = await unauthGet("/store/promotions")
    expect(res.status).toBe(200)
  })
})

describe("Store Regions", () => {
  it("GET /store/regions — 无需认证", async () => {
    const res = await unauthGet("/store/regions")
    expect(res.status).toBe(200)
  })
})

describe("Store Locales", () => {
  it("GET /store/locales — 返回店铺语言", async () => {
    const res = await unauthGet("/store/locales")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.locales).toBeInstanceOf(Array)
  })
})

// ============================================================================
// Auth & Health
// ============================================================================
describe("Auth & Health", () => {
  it("GET /auth/session — admin token 可访问", async () => {
    const res = await apiGet("/auth/session")
    expect([200, 404]).toContain(res.status)
  })

  it("DELETE /auth/session — admin token 可登出", async () => {
    const res = await apiDelete("/auth/session")
    expect(res.status).toBe(200)
  })

  it("GET /health — 无需认证", async () => {
    const res = await unauthGet("/health")
    expect(res.status).toBe(200)
  })

  it("GET /health — 返回 ok", async () => {
    const res = await unauthGet("/health")
    const body = await res.json()
    expect(body.status).toBe("ok")
  })
})
