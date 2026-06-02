# 项目状态 — 单一事实来源

> **代码核实日期**：2026-06-01
> **切勿信任本文档之外的旧状态**（14/15/16 已合并入本文，勿再看）。

---

## 快速判断

**Admin MVP → 可运营**：产品上架、订单处理、库存管理、售后 RMA、客户管理 主线全通。
**等价 Medusa v2 全功能**：~60%（缺规则引擎、视图持久化等高级功能）。

---

## 完成度

| 维度 | 完成度 | 代码证据 |
|------|:------:|----------|
| **Admin 页面壳** | ~85% | `apps/admin/src/app.tsx` 注册 100+ 路由 |
| **Admin 可运营深度** | ~80% | 产品/订单/客户/库存/履约/RMA 主线通 |
| **订单模块** | ~88% | DTO + 履约 + 退款 + 退货 + 换货 + 索赔 |
| **产品模块** | ~85% | CRUD + 变体 + 媒体 + 价格 + 库存 + CSV 导入导出 |
| **库存/仓库** | ~80% | batch level + Locations + service zones |
| **Storefront** | ~65% | 见 `ecommerce-c-end/implementation-status.md` |
| **自动化测试** | 16 文件 / 106 条 全绿 | `pnpm --filter=@my-store/server test` |
| **client.ts** | 100% 零 noop | 所有 hooks ↔ client 方法对齐 |

---

## 后端 API 挂载矩阵

### Admin 路由（`apps/server/src/app.ts`）

| 路由前缀 | 文件 | 状态 | 说明 |
|----------|------|:----:|------|
| `/admin/products` | `routes/admin/products.ts` | ✅ | 含 variants/options/images 子路由 |
| `/admin/orders` | `routes/admin/orders.ts` | ✅ | 含 fulfillments/shipments/transfers/line-items |
| `/admin/customers` | `routes/admin/customers.ts` | ✅ | 含地址 CRUD + customer-groups 关联 |
| `/admin/carts` | `routes/admin/carts.ts` | ✅ | |
| `/admin/regions` | `routes/admin/regions.ts` | ✅ | |
| `/admin/sales-channels` | `routes/admin/sales-channels.ts` | ✅ | 含 batch products |
| `/admin/stock-locations` | `routes/admin/batch.ts` | ✅ | 含 fulfillment-sets/sales-channels/providers 子路由 |
| `/admin/inventory-items` | `routes/admin/batch.ts` | ✅ | 含 location-levels + batch |
| `/admin/fulfillments` | `routes/admin/fulfillments.ts` | ✅ | create/cancel/shipment |
| `/admin/returns` | `routes/admin/returns.ts` | ✅ | 含细粒度 request/request-items/receive-items/shipping-method |
| `/admin/claims` | `routes/admin/claims.ts` | ✅ | inbound/outbound items + shipping |
| `/admin/exchanges` | `routes/admin/exchanges.ts` | ✅ | inbound/outbound items + shipping |
| `/admin/order-edits` | `routes/admin/order-edits.ts` | ✅ | items/shipping-methods/promotions |
| `/admin/draft-orders` | `routes/admin/draft-orders.ts` | ✅ | edit workflow + convert-to-order |
| `/admin/payments` | `routes/admin/payments.ts` | ✅ | capture/refund |
| `/admin/uploads` | `routes/admin/uploads.ts` | ✅ | create + retrieve + delete（2026-06-01 修） |
| `/admin/views` | `routes/admin/views-locales-tax.ts` | ✅ | DB 持久化（2026-06-01 修，之前为空 stub） |
| `/admin/locales` | `routes/admin/views-locales-tax.ts` | ✅ | 从 store_locale 表读取 |
| `/admin/tax-providers` | `routes/admin/views-locales-tax.ts` | ✅ | 从 tax_provider 表读取 |
| `/admin/payment-collections` | `routes/admin/batch.ts` | ✅ | CRUD |
| `/admin/users` | `routes/admin/users.ts` | ✅ | 含 invites accept/resend |
| `/admin/*` （其他实体） | `routes/admin/batch.ts` | ✅ | categories/collections/shipping-options/currencies/promotions/campaigns/api-keys/notifications/workflow-executions/price-lists/price-preferences/tax-rates/tax-regions/product-tags/product-types/shipping-profiles/shipping-option-types/customer-groups/reservations/return-reasons/refund-reasons/fulfillment-providers/property-labels/fulfillment-sets — 统一 `crudRoutes` 工厂 |

### Store 路由

| 路由前缀 | 状态 | 说明 |
|----------|:----:|------|
| `/store/products` | ✅ | 含 `:handle` 详情 + `/realtime` 注水 |
| `/store/carts` | ✅ | line-items/shipping-methods/promotions/complete |
| `/store/orders` | ✅ | |
| `/store/customers` | ✅ | register/me |
| `/store/collections` | ✅ | |
| `/store/promotions` | ✅ | |
| `/store/regions` | ✅ | |
| `/store/sales-channels` | ✅ | |
| `/store/shipping-options` | ✅ | |
| `/store/payment-collections` | ✅ | 含 payment-sessions/authorize |
| `/store/payment-providers` | ✅ | |
| `/webhooks` | ✅ | rebuild-storefront |

### Auth

| 路由 | 状态 |
|------|:----:|
| `/auth/customer/emailpass` — 登录 | ✅ |
| `/auth/customer/emailpass/register` — 注册 | ✅ |
| `/auth/session` — GET/DELETE | ✅ |
| `/auth/token/refresh` | ✅ |
| `/auth/password/confirmReset` | ✅ |

---

## client.ts 状态

**100% 完成 — 零 noop。**

所有 Admin hooks（`apps/admin/src/hooks/api/*.tsx`）调用的 `sdk.admin.*` 方法在 `client.ts` 中均有对应的 RPC 实现，已对齐 Medusa v2.15.3 官方 JS-SDK 签名。

---

## 测试覆盖

| 测试文件 | 覆盖范围 |
|----------|----------|
| `tests/admin/products.test.ts` | 产品 CRUD |
| `tests/admin/orders.test.ts` | 订单 CRUD + DTO |
| `tests/admin/fulfillments.test.ts` | 履约流程 |
| `tests/admin/returns.test.ts` | 退货 |
| `tests/admin/order-edits.test.ts` | 订单编辑 |
| `tests/admin/rma-e2e.test.ts` | RMA 端到端 |
| `tests/admin/batch-api.test.ts` | 批量 API |
| `tests/admin/uploads.test.ts` | 文件上传 |
| `tests/admin/product-import-export.test.ts` | CSV 导入导出 |
| `tests/admin/p1-loc-cat.test.ts` | Locations + 分类关联 |
| `tests/admin/full-api-coverage.test.ts` | **新增** Views/设置区全覆盖（2026-06-01） |
| `tests/auth/session.test.ts` | JWT 会话 |
| `tests/auth/p2-auth.test.ts` | 密码重置 + 邀请 |
| `tests/store/carts.test.ts` | 购物车 + checkout |
| `tests/services/order/admin-order.test.ts` | 订单 DTO |
| `tests/lib/order-aggregate-status.test.ts` | 状态聚合 |
| `tests/lib/order-fields.test.ts` | Fields 解析 |

**运行**：`pnpm --filter=@my-store/server test`

---

## C 端（Storefront）状态

详见 `ecommerce-c-end/implementation-status.md`。

**已实现**：Hybrid SSG/SSR、Content Loader、Image/Picture、Nano Stores、CartBadge、PDP 价/库存注水、购物车+结算+登录/注册、middleware、cookie auth、搜索、sitemap/JSON-LD、Playwright E2E、Docker/Vercel/CI 部署。

**未实现**：Stripe 支付、i18n 多语言、View Transitions、`<dialog>` 购物车抽屉。

---

## 技术债

| 项 | 影响 | 优先级 |
|----|------|:------:|
| `@ts-nocheck` ~250 文件 | 类型检查不严 | P3 可选 |
| 促销规则引擎 | `promotion.code` 应用逻辑简化 | 低（表级 CRUD 有） |
| shipping-options rules/batch | 高级配送规则 | 低（基础 CRUD 有） |
| 订单 export 返回 JSON 非 CSV | 非导出文件格式 | 低 |
| upload retrieve 是文件系统扫描 | 非真实文件检索 | 低 |

---

## 维护

- 代码变更后更新本文对应行
- 新增路由更新 §API 挂载矩阵
- 新增测试更新 §测试覆盖
- **不要再维护 14/15/16** — 已合并入本文
