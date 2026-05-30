# Admin 页面 ↔ API 缺口对照表

> **用途**：按 Admin 导航模块列出「页面 → 关键 API → 后端/Client 状态 → 典型问题」，用于排期与验收。  
> **可执行任务**：[`15-ai-improvement-tasks.md`](./15-ai-improvement-tasks.md) · **全量收尾 Phase 0–6**：[`16-full-completion-playbook.md`](./16-full-completion-playbook.md)  
> **更新**：2026-05-30（对照 `apps/admin/src/app.tsx`、`apps/admin/src/lib/client.ts`、`apps/server/src/app.ts`）  
> **勿用**：[`11-feature-tracker.mdx`](./11-feature-tracker.mdx) 明细行 — **已归档**，见本文 + playbook §1。

---

## 图例

| 标记 | 含义 |
|------|------|
| ✅ | 列表/详情/基础 CRUD 可走通 |
| ⚠️ | 路由有，但 workflow 简化、响应缺字段、或 **hooks 调用的 client 方法缺失** |
| ❌ | 后端无路由，或 client 方法缺失导致 **请求不发 / runtime 报错** |

**验收三步**（DevTools → Network）：

1. 请求是否 **404**
2. **200** 但响应是否缺 UI 期望字段（console 红字）
3. `client.ts` 是否存在 hooks 所需方法（`rg "sdk.admin" apps/admin/src/hooks`）

> **2026-05-30**：`client.ts` **已无 `noop`**；剩余问题多为 **方法名/子路由与 Medusa hooks 不一致**。

**代码入口**：

| 层 | 路径 |
|----|------|
| Admin 路由 | `apps/admin/src/app.tsx` |
| SDK 适配 | `apps/admin/src/lib/client.ts` |
| 后端挂载 | `apps/server/src/app.ts` |
| 订单 DTO | `apps/server/src/services/order/admin-order.ts` |
| 批量/关联 | `apps/server/src/routes/admin/batch.ts` |

---

## 总体完成度（2026-05-30）

| 维度 | 完成度 | 说明 |
|------|:------:|------|
| 基础设施 | ~95% | JWT、CORS、health、AppType RPC |
| Admin 日常 CRUD | ~80% | 产品/订单/客户/库存列表与编辑 |
| Admin 复杂向导 | ~55% | RMA/Locations/views — client 仍有洞 |
| 订单 DTO | ~88% | 主体齐；fulfillment `service_zone` 链未齐 |
| Storefront | ~55% | 列表/详情/cart/三步 checkout |
| 集成测试 | 86 条 | `pnpm --filter=@my-store/server test` 全绿 |
| 文档 | ~90% | 本文 + 15 + 16 已同步；11 仅快照 |

**综合（Admin MVP）**：~**76%** · **对齐 Medusa v2 全功能**：~**50%**

---

## P0 — client/hooks 与后端仍不对齐（2026-05-30 已补丁）

| 模块 | hooks 期望 | client/后端现状 | 状态 |
|------|-----------|----------------|------|
| **Claims** | `addInboundItems`、`addOutboundShipping` 等 | `claimClient` 已对齐 exchange 命名 + outbound 路由 | ✅ |
| **分类** | `productCategory.updateProducts` | `POST .../:id/products` | ✅ |
| **合集** | `productCollection.updateProducts` | 同上 | ✅ |
| **fulfillmentSet** | `createServiceZone` 等 | service-zones CRUD 路由 + client | ✅ |
| **views** | `sdk.admin.views.*` | 最小 stub 路由 + client | ⚠️ 空配置 |
| **fulfillment** | `POST /admin/fulfillments` + shipment | 路由 + client 已接 | ✅ |
| **taxProvider** | `taxProvider.list` | `GET /admin/tax-providers` | ✅ |
| **locale** | `locale.list` | `GET /admin/locales`（store_locale） | ✅ |

---

## 1. 产品 `/app/products`

| Admin 页面 | 主要 API | 后端 | Client | 状态 | 备注 |
|-----------|---------|------|--------|------|------|
| 产品列表/详情 | `GET /admin/products` | ✅ | ✅ | ✅ | `*categories` 等在 default fields |
| 创建/编辑 | POST products + variants/options | ✅ | ✅ | ⚠️ | workflow 未 100% 对齐官方 |
| 媒体 | images + uploads | ✅ | ✅ | ✅ | |
| 价格 | price-lists + variant prices | ✅ | ✅ | ✅ | linkProducts/batchPrices 已接 |
| 库存 | location-levels + batch | ✅ | ✅ | ✅ | updateLevel/batch 已接 |
| 销售渠道 batch | `POST .../sales-channels/:id/products` | ✅ | ✅ | ✅ | batchProducts/updateProducts |
| 变体库存套件 | `.../inventory-items/batch` | ✅ | ✅ | ✅ | batchVariantInventoryItems |
| **导入/导出** | import/export + confirm | ✅ CSV | ✅ FormData | ⚠️ | 核心字段；非完整 Medusa 模板列 |
| 组织-分类关联 | `POST .../categories/:id/products` | ✅ | ✅ updateProducts | ✅ | |

---

## 2. 订单 `/app/orders`

| Admin 页面 | 主要 API | 后端 | Client | 状态 | 备注 |
|-----------|---------|------|--------|------|------|
| 列表/详情 | orders + fields | ✅ | ✅ | ✅ | payment/fulfillment_status |
| 履行/发货 | fulfillments/shipments | ✅ | ✅ | ⚠️ | 订单下路由齐 |
| 支付 capture/refund | payments | ✅ | ✅ | ✅ | |
| **退货** | returns 细粒度 | ✅ | ✅ returnClient | ⚠️ | preview DTO 已接；收货流待 UI 验 |
| **换货** | exchanges inbound/outbound | ✅ | ✅ exchangeClient | ⚠️ | preview + return_id 已接 |
| **索赔** | claims inbound/outbound | ✅ | ✅ claimClient | ⚠️ | preview + companion return 已接 |
| 订单编辑 | order-edits | ✅ | ✅ | ✅ | shipping-method 子路由已补 |
| 草稿订单 | draft-orders + edit | ✅ | ✅ | ✅ | |
| 预览 | `GET .../preview` | ✅ | ✅ retrievePreview | ✅ | RMA 向导依赖 |
| 导出 | `POST /admin/orders/export` | ✅ CSV | ✅ | ✅ |

### 订单详情 DEFAULT_FIELDS（`order-detail/constants.ts`）

| 字段/关联 | 状态 |
|----------|------|
| items.variant / variant.product | ✅ |
| shipping/billing 地址 | ✅ |
| credit_lines、promotions | ✅ |
| payment_collections.payments.refunds | ✅ |
| items.variant.inventory_items | ✅ |
| fulfillments + items/labels/shipping_option 浅层 | ✅ |
| fulfillments.shipping_option.service_zone 链 | ✅ |

---

## 3. 客户 `/app/customers`

| 功能 | 后端 | Client | 状态 |
|------|------|--------|------|
| CRUD | ✅ | ✅ | ✅ |
| 地址 CRUD | ✅ | ✅ | ✅ |
| 客户群组 batch | ✅ `POST .../customer-groups` | ✅ | ✅ |

---

## 4. 分类 / 合集

| 功能 | 后端 | Client | 状态 |
|------|------|--------|------|
| 分类/合集 CRUD | ✅ batch.ts | ✅ entityClient | ✅ |
| 关联产品 POST | ✅ categories/collections `:id/products` | ✅ updateProducts | ✅ |

---

## 5. 库存 / 仓库

| 功能 | 后端 | Client | 状态 |
|------|------|--------|------|
| inventory-items CRUD | ✅ | ✅ | ✅ |
| location-levels 单条/批量 | ✅ | ✅ | ✅ |
| stock-locations + fulfillment-sets 子路由 | ✅ | ✅ | ✅ | 详情含嵌套 fulfillment_sets |
| fulfillmentSet **service zone** | ✅ CRUD 路由 | ✅ client 方法 | ✅ API 测试 |
| 预留 reservations | ✅ | ✅ | ⚠️ |

---

## 6. 促销 / 定价

| 功能 | 后端 | Client | 状态 |
|------|------|--------|------|
| promotions/campaigns | ✅ 表级 CRUD | ✅ | ⚠️ 无完整规则引擎 |
| price-lists + prices/batch | ✅ | ✅ | ✅ |

---

## 7. 设置区

| 功能 | 后端 | Client | 状态 |
|------|------|--------|------|
| regions CRUD + DELETE | ✅ | ✅ | ✅ |
| sales-channels | ✅ | ✅ | ✅ |
| stores + currencies | ✅ | ✅ add/removeCurrencies | ✅ |
| users/invites | ✅ | ✅ | ⚠️ 无邮件 |
| tax-regions / tax-rates | ✅ | ✅ entityClient | ✅ |
| fulfillment-providers | ✅ | ✅ | ✅ |
| shipping-options CRUD | ✅ | ✅ | ⚠️ rules/batch 未实现 |
| uploads | ✅ | ✅ retrieve/delete | ⚠️ retrieve 为占位 id→url |
| **views**（列/视图配置） | ⚠️ 最小 stub | ⚠️ client 已接 | ⚠️ 空配置 |

---

## 8. 认证

| 功能 | 状态 |
|------|------|
| 登录 / refresh / session GET | ✅ |
| logout DELETE session | ✅ 简化 |
| confirmReset password | ✅ 简化 |
| 注册 / OAuth / 邮件 reset | ❌ |
| invites create/accept/resend | ✅ API；❌ 无 SMTP |

---

## 9. Storefront

| 功能 | API | 状态 |
|------|-----|------|
| 产品列表/详情 | store/products | ✅ |
| 购物车 + line-items | store/carts | ✅ |
| 配送 shipping-options + cart shipping-methods | ✅ | ⚠️ 依赖 DB 有 shipping_option |
| 支付 payment-collections + manual authorize | ✅ | ⚠️ 仅 pp_system_default |
| checkout 三步 UI | Astro | ✅ |
| 客户注册/登录 UI | store/customers | ❌ 无页面 |
| collections / promotions | — | ❌ |

---

## 10. 非文档工程债（P3 余留）

| 项 | 状态 | 说明 |
|----|------|------|
| Admin `@ts-nocheck` | ~170 文件 | 类型债，不影响运行 |
| Playwright Admin E2E | 无 | 见 `12-testing-plan.mdx` |
| 全页 Network 404 扫描 | 未自动化 | 建议按模块手动验收 |
| Drizzle vs 线上列差异 | 偶发 | 如 shipping_option.type_id — 已用 raw SQL 规避 |

---

## 11. 推荐执行顺序（2026-05-30 起）

### P0 — client 补丁（数小时）

1. claimClient 补 inbound/outbound 方法别名  
2. productCategory / productCollection 的 `updateProducts`  
3. fulfillmentSet service zone 方法或 hooks 降级  
4. views 最小 stub 或隐藏 UI 入口  

### P1 — 联调深度

5. RMA 向导端到端（return/exchange/claim + preview）  
6. Locations 完整配置流  
7. 订单 export 真 CSV  

### P2 — Storefront + 质量

8. 客户登录/注册页、商品价格展示  
9. Playwright 冒烟（登录 + 产品列表 + 订单详情）  

---

## 12. 验收 Checklist 模板

```markdown
### [模块名] — YYYY-MM-DD
- [ ] 页面无 console error
- [ ] Network 无 404
- [ ] hooks 调用的 sdk.admin.* 在 client.ts 存在
- [ ] 更新本表对应行
```

---

## 13. 维护说明

- **`noop` 已清零**：验收改查 hooks ↔ client 方法名。  
- 代码变更后同步更新 **本文 + 15 任务表 + 16 playbook §1**。  
- `11-feature-tracker.mdx` **不再逐行维护**；仅保留模块级快照。
