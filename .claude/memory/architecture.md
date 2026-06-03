---
name: architecture
description: 项目架构关键事实，非代码可见的约定和坑
metadata:
  type: reference
---

## 价格查询链

产品价格不在 variant 表上，需要联表：
`product_variant → product_variant_price_set → price_set → price`
price 表**没有 variant_id 列**，只能通过 price_set_id 关联。

## 数据库 vs Drizzle Schema 差异

- Drizzle schema 定义 `price` 表没有 `variant_id` 列
- 但 product.service.ts `create()` 用 raw SQL `INSERT INTO price (..., variant_id, ...)` 写入
- 实际库表可能有 variant_id（Drizzle schema 未声明），也可能没有
- **读取价格必须走 price_set 链**，不要直接查 variant_id

## 死代码

- `routes/admin/inventory-items.ts` — app.ts 用的是 batch.ts 里的 `adminInventoryItemsFull`
- `routes/admin/stock-locations.ts` — 同上，用 `adminStockLocationsFull`
- 这两个文件都是只有 GET 的薄包装，从未被挂载

## 存根 / 占位

- `routes/admin/views-locales-tax.ts` 的 `adminViews` — 返回 `id: "view_stub"`，注释写"后续可接 custom_ 表"
- `lib/dev-mail.ts` — 已被 mail.ts 替换，旧文件已删除

## Admin 前端 key 选择器

- 登录表单: `input[autocomplete="email"]`, `input[type="password"]`, `button[type="submit"]`
- i18n 翻译后 placeholder 文本不可靠，不要用占位符匹配
- token 存 `localStorage` key `admin_token`
- JWT token storage key 由 `__JWT_TOKEN_STORAGE_KEY__` 环境变量控制

## Playwright

- baseURL 必须有尾部 `/`（如 `http://localhost:5174/app/`），否则 `page.goto("login")` 丢路径
- CI 下 admin 由 server 内置静态服务（SERVE_ADMIN=1，端口 7000）
- `webServer` 配置为 undefined，CI 手动起服务

## 测试连接

- Supabase session pooler pool_size=15，Vitest 必须 `fileParallelism: false, maxWorkers: 1`
- 测试用 `app.fetch()` 不发真实 HTTP，通过 Hono `app` 实例直调

**Why:** 这些信息不在代码里或容易被忽略，新对话时需要知道。
**How to apply:** 遇到价格查询、路由挂载、前端选择器、测试配置等问题时参考。
