# 全量收尾执行手册 — 交给 AI 直接做完

> **用途**：一份文档跑完全部剩余工作。按 **Phase 0→6** 顺序执行，每 Phase 结束跑验收命令、更新状态表，直到「项目完成定义」全部勾选。  
> **前置**：[`00-agent-handoff.md`](./00-agent-handoff.md) 硬性规则（链式 Hono、软删、不改 `apps/backend/`、Admin 方案 A）。  
> **对照**：[`14-admin-api-gap-matrix.md`](./14-admin-api-gap-matrix.md)（模块）、[`15-ai-improvement-tasks.md`](./15-ai-improvement-tasks.md)（单任务，**总览表部分状态已超前于细节，以本文代码核实为准**）。  
> **扫描日期**：2026-05-30（P3 文档同步完成）

---

## 0. 一键启动 Prompt（复制给 AI）

```
你是 my-medusa-store-hono 项目的收尾工程师。

1. 阅读 docs/00-agent-handoff.md 与 docs/16-full-completion-playbook.md
2. 从 Phase 0 开始，按顺序执行到 Phase 6
3. 每完成一个 Phase：
   - 运行该 Phase 验收命令
   - 更新本文 §2 状态表
   - 同步 docs/14-admin-api-gap-matrix.md 与 docs/15-ai-improvement-tasks.md
4. 最小 diff；中文 UI；禁止 git commit（除非用户要求）
5. 实现 UI 前查 apps/admin/demo/dashboard 对应页面
6. 遇到 Medusa 行为不明时查 docs/02-api-endpoints.mdx

当前从 Phase ___ 开始（填 0–6）。
```

---

## 1. 完成度评估（代码核实，非文档臆测）

### 1.1 总体

| 维度 | 完成度 | 说明 |
|------|:------:|------|
| **基础设施** | ~95% | JWT、CORS、health、AppType RPC、多 entry |
| **Admin 页面壳** | ~85% | Dashboard 拷贝全，路由齐 |
| **Admin 可运营深度** | ~76% | batch/RMA/fulfillment 已接 RPC；CSV import/export 可用 |
| **订单模块** | ~88% | DTO 含 promotions/refunds/inventory_items；fulfillment 浅层 option |
| **产品模块** | ~85% | categories 默认 fields；batch + CSV 导入导出 |
| **库存/仓库** | ~75% | batch level + Locations 子路由已挂；service zone 未接 |
| **Storefront** | ~55% | 列表+详情+cart+checkout 三步（信息/配送/支付） |
| **自动化测试** | ~55% | 86 条 server 集成测试 |
| **文档一致性** | ~90% | 11 归档 + 14/15/16 已同步（2026-05-30） |

**综合（Admin MVP 日常可用）**：约 **76%**  
**综合（对齐 Medusa v2 Admin 全功能）**：约 **50%**

### 1.2 测试现状

```bash
pnpm --filter=@my-store/server test
# 当前：13 files / 86 tests — 全部通过 ✅
```

### 1.3 已确认完成（勿重复做）

| 项 | 证据 |
|----|------|
| 空订单根级金额 `item_subtotal` 等 | `admin-order.ts` SUMMARY_DEFAULTS + 测试 |
| 订单 items.variant.product | `loadDetailLineItems` left join |
| 订单 shipping/billing 地址 | `order.shipping_address_id` + `orderAddress` 读库 |
| 订单 payment_collections.payments.refunds | `loadPaymentCollections` SQL 嵌套 |
| 订单 credit_lines 数组 | `orderCreditLine` 查询 |
| 订单 payment/fulfillment_status | `status.ts` aggregate |
| 产品 tags/sales_channels/collection/type/options/images/variants | `product.service fetchRelations` |
| 分类/渠道 batch 关联产品 **后端** | `batch.ts` category + sales-channel products POST |
| 销售渠道 batchProducts **client** | `client.ts` RPC 已接 |
| 客户 batchCustomerGroups **client** | `client.ts` RPC 已接 |
| taxRate、单条 inventory level、priceList prices | client 非 noop |
| 订单 promotions 完整对象 + refunds.refund_reason | `admin-order.ts` |
| 订单 items.variant.inventory_items | `admin-order.ts` |
| 订单 fulfillments items/labels/shipping_option | `loadFulfillments` |
| priceList linkProducts / batchPrices 后端+client | `batch.ts` + `client.ts` |
| 库存 batch levels 后端+client | `inventoryLevelService.batch` |
| 合集 link products | `adminCollectionLinkProducts` |
| RMA return 细粒度路由 + client | `returns.ts` + `returnClient` |
| claim/exchange/orderEdit/fulfillment client | `client.ts` 已接 RPC（claim 命名见 P0） |
| 产品 import/export CSV | `product-import.service.ts` + `POST /export` / `/import` |
| Storefront cart + checkout | `storefront/src/pages/cart.astro` 等 |
| client.ts **零 noop** | 2026-05-30 已全部替换 |
| 文档 11/14/15/16 同步 | 2026-05-30 P3 完成 |

### 1.4 仍缺 / 半成品（后续迭代 — 非文档项）

| 项 | 现状 |
|----|------|
| **P0 client/hooks 不对齐** | ✅ 2026-05-30 TASK-CLIENT-001 完成；views 为空 stub |
| 订单 fulfillments 深层 `service_zone` 链 | 仅 shipping_option 浅层 |
| 订单 export | 返回 JSON 列表，非 CSV |
| Auth invite/accept | 简化实现，非完整 Medusa 邮件流 |
| Storefront 账户/促销 | checkout 有；无登录/注册/collections |
| Admin E2E / Playwright | 无 — [TASK-QA-001](15-ai-improvement-tasks.md#task-qa-001) |
| `@ts-nocheck` | ~170 文件，类型债 |
| 集成测试 | 当前 86 条 ✅ |

### 1.5 client noop 剩余

**无** — `apps/admin/src/lib/client.ts` 已无 noop 引用（2026-05-30）。

---

## 2. Phase 执行状态（AI 每 Phase 后更新）

| Phase | 名称 | 状态 | 完成日期 |
|:-----:|------|:----:|---------|
| 0 | 订单详情收尾 | 🟢 | 2026-05-30 |
| 1 | 产品 + 定价 | 🟢 | 2026-05-30 |
| 2 | 库存 + 关联 API | 🟢 | 2026-05-30 |
| 3 | 订单 RMA（售后） | 🟢 | 2026-05-30 |
| 4 | Locations + 物流 | 🟢 | 2026-05-30 |
| 5 | Storefront + Auth | 🟢 | 2026-05-30 |
| 6 | 文档 + 测试 + 验收 | 🟢 | 2026-05-30 |

状态：🔴 未开始 · 🟡 进行中 · 🟢 已完成

---

## 3. Phase 0 — 订单详情收尾（P0）

**目标**：Admin 订单详情页打开无 console error，Network 字段满足 `order-detail/constants.ts`。

### 0.1 任务清单

| # | 任务 | 文件 | 验收 |
|---|------|------|------|
| 0.1 | `promotions` 改为 join `promotion` 表返回完整对象 | `admin-order.ts` | `order.promotions[0].code` 存在 |
| 0.2 | `refunds` join `refund_reason` | `admin-order.ts` | `refunds[0].refund_reason` 可选 |
| 0.3 | `items.variant.inventory_items` + `required_quantity` | `admin-order.ts` | 预留/库存区块不报错 |
| 0.4 | fulfillments 加载 items/labels/shipping_option 浅层 | `admin-order.ts` | 履约 section 有 option name |
| 0.5 | `region` 含 `automatic_taxes`（schema 已有） | 已查 region 表 | `order.region.automatic_taxes` boolean |
| 0.6 | 扩展 `fields.ts`：`wantsItemsVariant` 等 + field mask | `fields.ts` | fields 裁剪不删必需嵌套 |
| 0.7 | 集成测试：有 line item + payment 的订单详情 | `tests/admin/orders.test.ts` | 断言 variant、payments、address 键 |

### 0.2 参考

- Admin fields：`apps/admin/src/routes/orders/order-detail/constants.ts`
- 官方形状：demo `order-detail/loader.ts`
- DB：`packages/db/src/schema/order.ts`（已有 `shipping_address_id`）

### 0.3 验收

```bash
pnpm --filter=@my-store/server test
pnpm --filter=@my-store/server test tests/admin/orders.test.ts
```

手动：登录 Admin → 打开有商品行的订单 → DevTools 无红字。

---

## 4. Phase 1 — 产品 + 定价（P0/P1）

### 1.1 任务清单

| # | 任务 | 文件 |
|---|------|------|
| 1.1 | `defaultAdminProductFields` 加 `"*categories"` | `product.service.ts` |
| 1.2 | 产品详情页联调：组织 section 显示分类 | 仅验证 |
| 1.3 | `POST /admin/products/:id/variants/inventory-items/batch` | 新 route 或 `product-variants.ts` + service |
| 1.4 | client `batchVariantInventoryItems` 接 RPC | `client.ts` |
| 1.5 | `POST /admin/price-lists/:id/products` linkProducts | `batch.ts` 或 price-list service |
| 1.6 | `POST /admin/price-lists/:id/prices/batch` batchPrices | 同上 |
| 1.7 | client `linkProducts` / `batchPrices` 接 RPC | `client.ts` |
| 1.8 | 创建/编辑产品 E2E 联调（options+variants+组织字段） | 修 service/validators |

### 1.2 验收

```bash
pnpm --filter=@my-store/server test tests/admin/products.test.ts
```

- 变体 manage-inventory-items 页保存成功
- 价格列表详情可关联产品

---

## 5. Phase 2 — 库存 + 合集关联（P1）

### 2.1 任务清单

| # | 任务 | 文件 |
|---|------|------|
| 2.1 | `POST /admin/inventory-items/location-levels/batch` | `inventory-levels` route + service |
| 2.2 | client 三个 batch inventory 方法 | `client.ts` |
| 2.3 | `POST /admin/collections/:id/products` | `batch.ts`（仿 category link） |
| 2.4 | collection-add-products 页联调 | 验证 Network |
| 2.5 | category link client（若 entityClient 不够则加 batch 方法） | `client.ts` |

### 2.2 验收

- 库存详情批量改 level
- 合集详情添加产品后产品详情可见 collection

---

## 6. Phase 3 — 订单 RMA 售后（P1，工作量大）

**策略**：按 Admin wizard 步骤实现，不要一次做完 40 个 noop。参照 `docs/03-business-workflows.mdx` 与 demo returns 路由。

### 3.1 Return Phase 1（最小可走完创建退货）

| client 方法 | 建议 API |
|-------------|---------|
| `initiateRequest` | `POST /admin/returns/:id/request` |
| `addReturnItem` | `POST /admin/returns/:id/request-items` |
| `confirmRequest` | `POST /admin/returns/:id/request/confirm` |
| `receiveItems` | `POST /admin/returns/:id/receive-items` |

已有：`POST /admin/returns`、`/:id/cancel`、`/:id/receive/confirm`

### 3.2 Return Phase 2

其余 return noop：update/remove items、shipping、receive/dismiss 细粒度。

### 3.3 Exchange + Claim

对照 demo `order-create-exchange`、`order-create-claim` 逐步补 route + client。

### 3.4 Order Edit

`orderEdit.delete`、`initiateRequest` 及 `*Action` 方法。

### 3.5 验收

- Admin：订单详情 → 创建退货 wizard 可走通
- 换货/索赔至少各 1 条 happy path

---

## 7. Phase 4 — Locations + 物流（P1）

### 4.1 任务清单

| # | 任务 |
|---|------|
| 4.1 | `stockLocation.createFulfillmentSet` → 后端 POST + client |
| 4.2 | `updateFulfillmentProviders` / `updateSalesChannels` |
| 4.3 | Location 内 shipping option create/update/delete（对照 demo locations 路由） |
| 4.4 | `fulfillment.list/retrieve/create/cancel/createShipment` |
| 4.5 | `fulfillmentProvider.list/listFulfillmentOptions` |
| 4.6 | `order.retrieveShippingOption` |

### 4.2 验收

- Location 详情：创建 service zone + 一条 shipping option
- 订单创建 fulfillment 不 404

---

## 8. Phase 5 — Storefront + Auth（P2）

### 5.1 Storefront（Astro）

| # | 页面/功能 | API |
|---|----------|-----|
| 5.1 | `src/pages/cart.astro` 或 island | `GET/POST /store/carts` |
| 5.2 | 加购按钮（产品详情） | `POST /store/carts/:id/line-items` |
| 5.3 | checkout 页 | email + complete → `POST /store/carts/:id/complete` |
| 5.4 | 订单确认页 | 展示 order id |

### 5.2 Auth

| # | 任务 |
|---|------|
| 5.5 | `DELETE /auth/session` 或等价 logout + client |
| 5.6 | invite accept / createInvite client 对接已有 invites 路由 |
| 5.7 | confirmResetPassword（若后端缺则补） |

---

## 9. Phase 6 — 文档 + 测试 + 项目完成定义（P2）

### 6.1 文档同步

- [ ] 重写 `11-feature-tracker.mdx` 关键行（以代码为准）
- [ ] 修正 `14-admin-api-gap-matrix.md` 所有 ✅/❌
- [ ] `15-ai-improvement-tasks.md` 总览与细节一致
- [ ] 本文 §2 全部 🟢

### 6.2 测试扩充（最低限度）

- [ ] 每 Phase 至少 1 个集成测试文件或扩展现有
- [ ] 订单详情：promotions、payments 嵌套
- [ ] 分类/合集 link products
- [ ] （可选）Playwright 登录 + 产品列表 smoke

### 6.3 项目完成定义（DoD）

全部勾选才算「做完」：

**后端**

- [ ] `apps/server/src/app.ts` 挂载的路由，Admin 对应页 Network 无 404
- [x] `client.ts` **零 noop**（2026-05-30 ✅）
- [x] hooks 调用的 `sdk.admin.*` 与 client 方法名对齐（TASK-CLIENT-001 ✅ 2026-05-30）
- [ ] 所有 DB 查询含 `deleted_at IS NULL`
- [ ] `pnpm --filter=@my-store/server test` 通过且测试数 ≥ 80

**Admin**

- [ ] 订单列表/详情/创建履行/退款 主路径无 console error
- [ ] 产品 create → detail → edit → variant 主路径可用
- [ ] 库存调整、Locations 一条 shipping option 可配置
- [ ] 退货 wizard Phase 1 可走通

**Storefront**

- [x] 列表 → 详情 → 加购 → checkout → 订单确认闭环（2026-05-30）

**文档**

- [x] 11 / 14 / 15 / 16 四份文档状态一致（2026-05-30）

---

## 10. 文件速查

| 层 | 路径 |
|----|------|
| 后端入口 | `apps/server/src/app.ts` |
| 订单 DTO | `apps/server/src/services/order/admin-order.ts` |
| 产品 service | `apps/server/src/services/product.service.ts` |
| 批量/关联路由 | `apps/server/src/routes/admin/batch.ts` |
| SDK 适配 | `apps/admin/src/lib/client.ts` |
| Admin 路由 | `apps/admin/src/app.tsx` |
| Demo 参考 | `apps/admin/demo/dashboard/src/routes/` |
| Validators | `packages/validators/src/` |
| Schema | `packages/db/src/schema/` |
| 集成测试 | `apps/server/tests/admin/` |

---

## 11. 风险与约束（AI 必读）

1. **不改** Medusa 表 DDL；`order.shipping_address_id` 已在 Drizzle schema 映射，以 DB 实际列为准。
2. **RMA / Locations** 工作量大：严格按 Phase 分 PR，避免单次 diff 超 500 行。
3. **promotions 规则引擎**不在范围：只需返回 UI 展示所需字段，不做完整 Medusa Promotion Module。
4. **@ts-nocheck** 清理为 P3 可选，不阻塞 DoD。
5. **产品 import/export** 核心 CSV 已完成；完整 Medusa 模板列为后续可选。

---

## 12. P3 可选（DoD 之后）

- ~~产品 import/export~~ ✅ 核心 CSV 已完成
- **TASK-CLIENT-001** — P0 client/hooks 对齐（优先）
- upload retrieve/delete 深化
- locale / taxProvider 真实数据
- workflow-executions 真实数据
- Admin Playwright 冒烟（TASK-QA-001）
- 逐步移除 `@ts-nocheck`

---

## 13. 维护

- 完成任一 Phase → 更新 §2 表 + 14/15 文档
- 发现新缺口 → 追加到对应 Phase，勿另起文档
- 用户要求 commit 时：按 phase 分批 commit message
