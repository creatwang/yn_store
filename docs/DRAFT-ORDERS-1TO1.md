# 草稿订单 Admin 1:1 对照官方实施说明

> **强制流程**：与根目录 `CLAUDE.md`、`docs/00-agent-handoff.md` §4.3 一致——**先 COPY 官方，再改 import / SDK**，禁止手写简化版表单。

## 官方源码位置

| 来源 | 路径 |
|------|------|
| Medusa 仓库 tag | `v2.15.3` |
| 插件 Admin | `packages/plugins/draft-order/src/admin/` |
| 本仓库对照目录 | `apps/admin/demo/draft-order-plugin/` |

拉取对照文件：

```bash
node scripts/sync-official-draft-order-plugin.mjs
```

## 与自建简化版的差异（必须消除）

| 区域 | 错误做法（已发生） | 官方做法 |
|------|-------------------|----------|
| 创建页 | 仅地址/客户，无商品 | `@create/page.tsx` 完整表单 |
| 详情页 | 4 个自建 Section | `useOrder` + `components/draft-orders/*` + Activity |
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
`orderService.getById` 已允许草稿单；需保证 `fields` / `presentAdminOrderDetail` 返回 items、promotions、shipping_methods、totals 与官方一致。

草稿编辑 mutation 后应 invalidate **`ordersQueryKeys.preview(id)`**（与官方 hooks 一致）。

## 验收清单

- [ ] 列表：列、筛选、排序、空状态与官方一致
- [ ] 创建：与 `@create/page.tsx` 字段一致
- [ ] 详情：Summary / Shipping / Customer / Activity / JSON / Metadata 区块齐全
- [ ] 子路由：items、promotions、shipping、地址、email 可打开 FocusModal
- [ ] 编辑流：改商品后 preview 更新，confirm 后详情刷新
- [ ] 无 console 报错、无 404 API
