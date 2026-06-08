# 项目状态（单一事实来源）

> **核实日期**：2026-05-30（对照 `apps/server/src/app.ts` + `apps/server/tests/`）  
> **待办清单** → [REMAINING-WORK.md](./REMAINING-WORK.md)  
> **文档索引** → [README.md](./README.md)

---

## 一句话

基于 Medusa v2.15.3 **PostgreSQL 表结构** 的自研 Hono 全栈电商（**不运行** `@medusajs/medusa`）。**日常 B 端运营 + C 端浏览/下单（手动支付）已可用**；等价 Medusa 全量约 **65%**。

---

## 完成度概览

| 维度 | 完成度 | 证据 |
|------|:------:|------|
| Admin 页面壳 | ~85% | `apps/admin/src/app.tsx` 100+ 路由 |
| Admin 可运营 | ~80% | 产品 / 订单 / 客户 / 库存 / 履约 / RMA / 草稿订单 |
| 后端 Admin API | ~85% | `app.ts` 60+ 前缀挂载 |
| Store API | ~75% | 12 组 store 路由；无 `?fields=` |
| Storefront (Astro) | ~70% | [ecommerce-c-end/implementation-status.md](./ecommerce-c-end/implementation-status.md) |
| Workflow + 事务 | ✅ 核心路径 | 9 workflow + `runInTransaction` |
| 自动化测试 | ✅ | **25 文件 / ~183 用例**（`pnpm --filter=@my-store/server test`） |
| 外部 Provider | ❌ 全 NOOP | Payment / Shipping / Notification / Inventory |

---

## 后端 API 挂载（`apps/server/src/app.ts`）

### Admin（已实现）

| 类别 | 路由前缀 | 说明 |
|------|----------|------|
| 商品 | `/admin/products` (+ variants/options/images 子路由) | CRUD、导入导出、batch |
| 订单 | `/admin/orders` | 履约、发货、转账、行项、备注、导出 |
| 售后 | `/admin/returns`、`/admin/claims`、`/admin/exchanges` | RMA 全流程 |
| 订单编辑 | `/admin/order-edits` | 改项、运费、促销 |
| 草稿订单 | `/admin/draft-orders` | 编辑 workflow、转正式单 |
| 客户 | `/admin/customers`、`/admin/customer-groups` | 含地址 |
| 库存 | `/admin/inventory-items`、`/admin/stock-locations`、`/admin/reservations` | batch levels |
| 履约 | `/admin/fulfillments`、`/admin/fulfillment-providers`、`/admin/fulfillment-sets` | |
| 支付 | `/admin/payments`、`/admin/payment-collections` | capture / refund |
| 定价促销 | `/admin/price-lists`、`/admin/promotions`、`/admin/campaigns` | |
| 区域税收 | `/admin/regions`、`/admin/tax-regions`、`/admin/tax-rates`、`/admin/tax-providers` | |
| 运输 | `/admin/shipping-options`、`/admin/shipping-profiles`、`/admin/shipping-option-types` | |
| 设置 | `/admin/stores`、`/admin/views`、`/admin/locales`、`/admin/currencies` | views 已 DB 持久化 |
| 用户 | `/admin/users`、`/admin/invites` | |
| 其他 | categories、collections、uploads、notifications、workflow-executions、api-keys、product-tags/types、return/refund-reasons、property-labels、carts、sales-channels 等 | 多数经 `crudRoutes` 工厂 |

### Store（已实现）

`/store/products`、`/store/carts`、`/store/orders`、`/store/customers`、`/store/regions`、`/store/sales-channels`、`/store/shipping-options`、`/store/payment-collections`、`/store/payment-providers`、`/store/collections`、`/store/promotions`

### Auth + Webhook

| 路径 | 说明 |
|------|------|
| `/auth/customer/emailpass` | 客户登录 / 注册 |
| `/auth/session`、`/auth/token/refresh` | 会话 |
| `/auth/password/confirmReset` | 密码重置 |
| `/webhooks/rebuild-storefront` | 触发 C 端 rebuild |

所有 REST 经 **`/api`** 前缀对外（见 `app.ts` 挂载）。

---

## 相对 Medusa 官方缺失（摘要）

完整对照 → [API-IMPLEMENTATION-GAP.md](./API-IMPLEMENTATION-GAP.md)

| 模块 | 状态 |
|------|:----:|
| `/admin/feature-flags` | ❌ Admin hooks 会调，server 无 |
| `/admin/translations/*` | ❌ Admin 有 UI 片段，server 无 |
| `/admin/plugins` | ❌ |
| 礼品卡 Gift Cards | ❌ |
| RBAC roles/policies 全量 | ⚠️ 仅 users/invites |
| Store API `?fields=` | ❌ |
| 真实支付 / 物流 / 通知 Provider | ❌ NOOP |

---

## Admin 前端

- **入口**：`pnpm dev --filter=@my-store/admin` → `http://localhost:5173/app/`
- **RPC**：`apps/admin/src/lib/api.ts`，**无** `@medusajs/js-sdk`
- **stub**：2026-06-05 官方拷贝层 stub 已清零（见 API-IMPLEMENTATION-GAP §5）
- **断链 UI**：翻译模块未注册路由；税区 metadata 页未接 API

---

## Storefront

详见 [ecommerce-c-end/implementation-status.md](./ecommerce-c-end/implementation-status.md)。

**已有**：Hybrid SSG/SSR、Content Loader、购物车+结算（手动支付）、登录/注册、Google OAuth、搜索、SEO、Playwright E2E、Docker/Vercel/CI。

**未有**：Stripe、i18n、`<dialog>` 购物车抽屉、View Transitions、Cloudflare adapter。

---

## 测试

```bash
pnpm --filter=@my-store/server test   # 25 文件，admin/store/auth/services/lib
pnpm --filter=@my-store/admin e2e     # smoke：登录 + 建单
```

主要覆盖：products、orders、fulfillments、returns、order-edits、rma-e2e、draft-orders、carts、auth、batch-api、uploads、import-export。

---

## 技术债

| 项 | 说明 |
|----|------|
| `@ts-nocheck` ~250 文件 | 主要在 Admin 拷贝层 |
| 事件总线 | 内存型，进程重启丢失 |
| 订单 export | 同步分页，超大订单可能超时 |
| server 全量 `tsc --noEmit` | 有历史 TS 债 |

---

## 维护约定

| 变更 | 更新 |
|------|------|
| 新/改 API | 本文 §API 挂载 + `API-IMPLEMENTATION-GAP.md` |
| 完成待办 | 从 `REMAINING-WORK.md` 删除 |
| C 端 | `ecommerce-c-end/implementation-status.md` |
