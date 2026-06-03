# 草稿订单 Admin 1:1 对照官方实施说明

> **强制流程**：与根目录 `CLAUDE.md`、`docs/00-agent-handoff.md` §4.3 一致——**先 COPY 官方，再改 import / SDK**，禁止手写简化版表单。

## 官方源码位置

| 来源 | 路径 |
|------|------|
| Medusa 仓库 tag | `v2.15.3` |
| 插件 Admin | `packages/plugins/draft-order/src/admin/` |
| 本仓库对照目录 | `apps/admin/demo/draft-order-plugin/` |

拉取对照文件（**每次发现详情页/hooks 被改回简化版时必须重跑**）：

```bash
pnpm sync:draft-order-plugin
node scripts/port-draft-order-admin-src.mjs
node scripts/audit-draft-orders-1to1.mjs
node scripts/fix-draft-order-list-imports.mjs
node scripts/fix-draft-order-create-imports.mjs
node scripts/fix-draft-order-child-route-imports.mjs
node scripts/fix-draft-order-imports.mjs
node scripts/check-draft-order-imports.mjs
node scripts/check-runtime-db.mjs
```

`check-draft-order-imports` 只做 **静态 import**；`check-runtime-db` 会跑 Admin 首页同款并行 probe，并提示 `DB_POOL_MAX`（Supabase Session 上限 15，默认单进程池 `max=4`）。

**Import 对照原则**（port 后自动跑 check）：

| 官方 demo 路径 | 本项目路径 |
|----------------|------------|
| `components/common/keybound-form` | `components/utilities/keybound-form` |
| `components/common/data-table` | `components/data-table` |
| `components/common/inline-tip` | `@medusajs/ui` 的 `InlineTip` |
| `components/inputs/number-input` | `components/inputs/number-input`（从官方 plugin 拷贝） |
| `hooks/order-edits/*` | `hooks/order-edits/*`（从官方 plugin 拷贝） |
| `lib/utils/number-utils` | `lib/utils/number-utils` |
| 子路由 `../../../hooks` | 应为 `../../../../hooks`（多一层目录） |

## 与自建简化版的差异（必须消除）

| 区域 | 错误做法（已发生） | 官方做法 |
|------|-------------------|----------|
| 创建页 | 仅地址/客户，无商品 | `@create/page.tsx` 完整表单 |
| 详情页 | 4 个自建 Section / `useDraftOrder` | `useOrder` + `GET /admin/orders/:id` + `components/draft-orders/*` + Activity |
| 列表 | 简易表格 | `DataTable` + 筛选（客户/渠道/地区/日期） |
| 编辑 | 直接写 DB | `beginEdit` → preview → `request` → `confirm` |
| Hooks | 部分 mutation | `hooks/api/draft-orders.tsx` 全量（与 preview 联动） |
| 子路由 | 无 | `items` / `promotions` / `shipping` / 地址 / email 等 FocusModal |

## 落地映射（admin/src）

| 官方（demo 内） | 项目路径 |
|----------------|----------|
| `routes/draft-orders/page.tsx` | `routes/draft-orders/draft-order-list/` |
| `routes/draft-orders/@create/page.tsx` | `routes/draft-orders/draft-order-create/` |
| `routes/draft-orders/[id]/page.tsx` | `routes/draft-orders/draft-order-detail/` |
| `routes/draft-orders/[id]/@*/page.tsx` | `routes/draft-orders/draft-order-detail/*/` 子路由 |
| `components/draft-orders/*.tsx` | `components/draft-orders/*.tsx` |
| `hooks/api/draft-orders.tsx` | `hooks/api/draft-orders.tsx`（`sdk` → `lib/client`） |

## Import 改写约定

| 官方 | 本项目 |
|------|--------|
| `../../lib/queries/sdk` | `../../lib/client` 的 `sdk` |
| `../../lib/data/currencies` | `../../lib/money-amount-helpers` |
| `../../components/common/data-table` | `../../components/table/data-table`（导出 `DataTable`） |
| `../../../components/common/page-skeleton` | `../../../components/common/skeleton` |

## 后端缝合（`docs/09-stitching-alignment.mdx`）

详情页官方使用 **`GET /admin/orders/:id`**（`useOrder`），不是仅 `draft-orders/:id`。  
`orderService.getById` 已允许草稿单；`presentAdminOrderDetail` 负责 items、promotions、shipping_methods 等。

草稿编辑 API 已对齐官方 v2.15.3 路径与 body（`apps/server/src/routes/admin/draft-orders.ts`）：

- `POST/DELETE .../edit` — begin / cancel
- `POST .../edit/items`、`.../items/:action_id`、`.../items/item/:item_id`
- `POST/DELETE .../edit/promotions` — body `{ promo_codes: [] }`（DELETE 带 JSON body）
- `POST/DELETE .../edit/shipping-methods`、`.../method/:method_id`
- `POST .../edit/request`、`.../edit/confirm`
- 所有 edit mutation 响应为 **`draft_order_preview`**（`buildDraftOrderEditPreview`）
- `GET /admin/orders/:id/preview` 草稿单走同一 preview 构建器

Admin SDK（`apps/admin/src/lib/client.ts`）：`removePromotions(id, { promo_codes })`、`updateItem` → `items/item/:itemId`、`removeShippingMethod` → `shipping-methods/method/:methodId`。

草稿编辑 mutation 后应 invalidate **`ordersQueryKeys.preview(id)`**（与官方 hooks 一致）。

## 防回退（必跑）

```bash
node scripts/port-draft-order-admin-src.mjs   # 详情必须用 useOrder，禁止 useDraftOrder 详情页
node scripts/audit-draft-orders-1to1.mjs      # 服务端路由与官方路径一致
```

## 验收清单

- [ ] 列表：列、筛选、排序、空状态与官方一致
- [ ] 创建：与 `@create/page.tsx` 字段一致
- [ ] 详情：Summary / Shipping / Customer / Activity / JSON / Metadata 区块齐全
- [ ] 子路由：items、promotions、shipping、地址、email 可打开 FocusModal
- [ ] 编辑流：改商品后 preview 更新，confirm 后详情刷新
- [ ] 无 console 报错、无 404 API
