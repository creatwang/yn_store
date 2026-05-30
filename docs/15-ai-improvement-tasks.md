# AI 改善任务清单 — 问题 backlog 与执行规范

> **用途**：供 Cursor / Trae / 其他 AI 按任务 ID 逐项改善项目，无需重读完整对话历史。  
> **全量收尾（推荐）**：[`16-full-completion-playbook.md`](./16-full-completion-playbook.md) — Phase 0–6 顺序做完 + DoD。  
> **对照表**：[`14-admin-api-gap-matrix.md`](./14-admin-api-gap-matrix.md)（模块级缺口）  
> **过时勿信**：[`11-feature-tracker.mdx`](./11-feature-tracker.mdx) 明细行 — 以 **14 + 16** 为准。  
> **更新**：2026-05-30（P3 文档同步）

---

## 0. 给接手 AI 的启动指令（复制即用）

```
请阅读并执行 docs/15-ai-improvement-tasks.md：
1. 先读 docs/00-agent-handoff.md 硬性规则
2. 从「当前阻塞项」或用户指定 TASK-ID 开始
3. 每完成一项：改代码 → 跑验收命令 → 更新本文件对应任务状态
4. 不要 git commit（除非用户要求）
5. 实现前到 apps/admin/demo/dashboard 找参考（方案 A）
```

**推荐单任务 Prompt 模板**：

```
执行 docs/15-ai-improvement-tasks.md 中的 TASK-ORD-001。
约束：遵循 handoff 规则；最小 diff；中文 UI 文案；完成后更新任务状态并列出验收结果。
```

---

## 1. 项目快照（接手时自检）

| 项 | 状态 |
|----|------|
| 后端挂载 | `apps/server/src/app.ts` — 45+ admin/store 模块 |
| Admin SDK 适配 | `client.ts` — **P0 hooks 已对齐**（2026-05-30 TASK-CLIENT-001） |
| 订单 DTO | `admin-order.ts` — 主体齐 |
| 集成测试 | **86/86 通过**（13 files） |
| Admin 类型债 | **~170 文件 @ts-nocheck**（非文档项，见 14 §10） |
| 文档 | **14 / 15 / 16 已同步**（2026-05-30）；11 仅快照 |

### 1.1 当前阻塞（代码，非文档）

P0 client/hooks 已于 2026-05-30 完成（TASK-CLIENT-001）。后续优先：RMA/Locations **联调深度**、Playwright（TASK-QA-001）。

### 1.2 历史文档纠错（已完成写入 14）

| 旧说法 | 实际（2026-05-30） |
|--------|-------------------|
| client 47 处 noop | ✅ 已清零 |
| 分类/合集/渠道 link products 无后端 | ✅ batch 路由已有 |
| import/export 占位 | ✅ CSV 解析 + 导出下载 |
| Store 无 checkout | ✅ Astro 三步 checkout |
| TASK-STORE/AUTH/CAT 全 🔴 | 见 §3 更新后状态 |

---

## 2. 任务状态图例

| 标记 | 含义 |
|------|------|
| 🔴 | 未开始 / 阻塞主流程 |
| 🟡 | 进行中 |
| 🟢 | 已完成（须填完成日期 + 验收命令输出摘要） |
| ⏸️ | 暂缓（写明原因） |

---

## 3. 任务总览（按优先级）

| ID | 标题 | 优先级 | 状态 |
|----|------|:------:|:----:|
| [TASK-ORD-001](#task-ord-001) | 修复空订单根级金额字段 | P0 | 🟢 |
| [TASK-ORD-002](#task-ord-002) | 订单详情加载 variant + product | P0 | 🟢 |
| [TASK-ORD-003](#task-ord-003) | 订单详情加载 shipping/billing 地址 | P0 | 🟢 |
| [TASK-ORD-004](#task-ord-004) | 订单详情 payment_collections.payments | P0 | 🟢 |
| [TASK-ORD-005](#task-ord-005) | 订单详情 credit_lines + promotions | P1 | 🟢 |
| [TASK-PROD-001](#task-prod-001) | 产品详情 fields 关联补齐 | P0 | 🟢 |
| [TASK-PROD-002](#task-prod-002) | 产品创建/编辑 workflow 联调 | P0 | 🟢 |
| [TASK-PROD-003](#task-prod-003) | batchVariantInventoryItems | P1 | 🟢 |
| [TASK-PRICE-001](#task-price-001) | priceList linkProducts + batchPrices | P1 | 🟢 |
| [TASK-INV-001](#task-inv-001) | 库存 batchUpdateLevels 三方法 | P1 | 🟢 |
| [TASK-RMA-001](#task-rma-001) | Return 细粒度 API | P1 | 🟢 |
| [TASK-RMA-002](#task-rma-002) | Exchange / Claim API + client | P1 | 🟡 |
| [TASK-LOC-001](#task-loc-001) | Locations fulfillmentSet + service zone | P1 | 🟡 |
| [TASK-CAT-001](#task-cat-001) | 分类/合集关联产品 | P1 | 🟡 |
| [TASK-SC-001](#task-sc-001) | 销售渠道 batchProducts | P1 | 🟢 |
| [TASK-DOC-001](#task-doc-001) | 同步 11/14/15/16 文档 | P2 | 🟢 |
| [TASK-STORE-001](#task-store-001) | Storefront checkout UI | P2 | 🟡 |
| [TASK-AUTH-001](#task-auth-001) | 登出 / 邀请 / 重置密码 | P2 | 🟡 |
| [TASK-CLIENT-001](#task-client-001) | P0 client/hooks 对齐（14 §P0） | P0 | 🟢 |
| [TASK-QA-001](#task-qa-001) | Playwright Admin E2E 冒烟 | P2 | 🔴 |

---

## 4. 任务详情

> 已完成（🟢）任务正文中的「Client noop」为 **2026-05-29 前历史记录**；当前以 §1 快照与 14 §P0 为准。

### TASK-ORD-001

**修复空订单根级金额字段**

| 项 | 内容 |
|----|------|
| 优先级 | P0 |
| 状态 | 🟢 |
| 问题 | 无 line items 的订单详情缺少 `item_subtotal` 等根级字段，集成测试失败 |
| 关键文件 | `apps/server/src/services/order/admin-order.ts` |
| 参考测试 | `apps/server/tests/admin/orders.test.ts` L131–145 |

**实现要点**：

1. 扩展 `SUMMARY_DEFAULTS`，包含 `ORDER_ROOT_TOTAL_KEYS` 中所有金额键，默认 `0`
2. 或：空 items 分支仍调用 `decorateOrderTotals` 并保证 `applyRootTotals` 写入全部根级键
3. 补充/更新 `tests/services/order/admin-order.test.ts` 空订单用例

**验收**：

```bash
pnpm --filter=@my-store/server test
# 期望：orders.test.ts GET /:id 通过；admin-order 单测通过
```

**完成记录**：2026-05-30 — 扩展 `SUMMARY_DEFAULTS` 包含 `ORDER_ROOT_TOTAL_KEYS` 全部键，默认 0。`pnpm test` 51/51 通过。

---

### TASK-ORD-002

**订单详情加载 variant + product**

| 项 | 内容 |
|----|------|
| 优先级 | P0 |
| 状态 | 🟢 |
| UI 期望 | `apps/admin/src/routes/orders/order-detail/constants.ts` → `*items.variant`, `*items.variant.product` |
| 关键文件 | `admin-order.ts`（读库 + present）、`packages/db` order/line_item/variant/product 表 |
| 架构约束 | 不改 Medusa 表结构；软删 `deleted_at IS NULL` |

**实现要点**：

1. 在 `loadOrderRelations`（或等价读库函数）中 join `product_variant` + `product`
2. 挂到 `items[].variant`，含 `product` 嵌套
3. 对齐官方 `formatOrder` 中 line item 形状（title、sku、thumbnail 等）

**验收**：

- [ ] 有 line item 的订单详情 Network 200，`items[0].variant.product` 存在
- [ ] 订单详情页行项显示 SKU/图片，无 console error

**完成记录**：2026-05-30 — `loadDetailLineItems` 增加 Drizzle left join 到 `product_variant` 和 `product`，`formatLineItem` 输出 `variant` 含 `product` 嵌套。`pnpm test` 51/51 通过。

---

### TASK-ORD-003

**订单详情加载 shipping/billing 地址**

| 项 | 内容 |
|----|------|
| 优先级 | P0 |
| 状态 | 🔴 |
| 架构冲突 | [C-03](./13-architecture-conflicts.mdx) — `order` 表可能无 `shipping_address_id` FK |
| 关键文件 | `admin-order.ts`、`docs/13-architecture-conflicts.mdx` |

**实现要点（二选一，需在 PR 说明决策）**：

- **方案 A（推荐短期）**：从 `order_address` 表按 order 关联读地址（若 DB 已有 FK 或 link 表）
- **方案 B**：从 `order.metadata` 解析地址 JSON，present 成 `shipping_address` / `billing_address` 对象
- 禁止擅自 ALTER Medusa 表；若需 FK 走 `custom_` 或文档记录后人工迁移

**验收**：

- [ ] `GET /admin/orders/:id` 响应含 `shipping_address`、`billing_address`
- [ ] 订单详情地址区块有数据或合理空态

---

### TASK-ORD-004

**订单详情 payment_collections.payments**

| 项 | 内容 |
|----|------|
| 优先级 | P0 |
| 状态 | 🔴 |
| UI 期望 | `*payment_collections.payments`、`*payments.refunds` |
| 关键文件 | `admin-order.ts`；`payment` / `payment_collection` / `refund` schema |

**实现要点**：

1. 加载 payment_collection → payments → refunds（含 refund_reason）
2. 金额字段走 `toAmount` / `raw_amount` 双列规范

**验收**：

- [ ] 有支付的订单详情，支付区块可展开
- [ ] refunds 数组存在（可为空）

---

### TASK-ORD-005

**订单详情 credit_lines + promotions + region**

| 项 | 内容 |
|----|------|
| 优先级 | P1 |
| 状态 | 🔴 |
| UI 期望 | `*credit_lines`、`*promotions`、`region.automatic_taxes` |
| 依赖 | TASK-ORD-001～004 建议先完成 |

**验收**：

- [ ] summary / credit_line_total 与 credit_lines 一致
- [ ] promotions 列表可迭代（空数组亦可）

---

### TASK-PROD-001

**产品详情 fields 关联补齐**

| 项 | 内容 |
|----|------|
| 优先级 | P0 |
| 状态 | 🔴 |
| 问题 | `GET /admin/products/:id?fields=...` 关联不完整（category、tags、sales_channels、collection 等） |
| 关键文件 | `apps/server/src/services/product.service.ts`、`routes/admin/products.ts` |
| 架构 | [C-02](./13-architecture-conflicts.mdx) fields 解析 |

**实现要点**：

1. 对照 demo `product-detail` loader 的 fields
2. 实现或扩展 `parseFields` / `wants()` 按需加载
3. 关联表用 Drizzle join + 软删

**验收**：

- [ ] 产品详情页各 section 无 `undefined is not iterable`
- [ ] Network 无 404

---

### TASK-PROD-002

**产品创建/编辑 workflow 联调**

| 项 | 内容 |
|----|------|
| 优先级 | P0 |
| 状态 | 🔴 |
| 页面 | `apps/admin/src/routes/products/product-create`、`product-edit` |
| 关键文件 | `product.service.ts` create/update；validators |

**实现要点**：

1. 对照 demo `product-create` 表单提交 payload
2. 确保 options、variants、组织字段（分类/标签/渠道）持久化
3. 错误时返回 Medusa 形状 `{ message, type }` 或项目统一错误格式

**验收**：

- [ ] 创建产品 → 详情可见
- [ ] 编辑组织字段保存后刷新仍正确

---

### TASK-PROD-003

**batchVariantInventoryItems**

| 项 | 内容 |
|----|------|
| 优先级 | P1 |
| 状态 | 🔴 |
| Client | `client.ts` → `product.batchVariantInventoryItems: noop` |
| 页面 | `product-variant-manage-inventory-items` |

**实现要点**：

1. 后端 `POST /admin/products/:id/variants/inventory-items/batch`（或 Medusa 等价路径，查 `docs/02`）
2. client 改为 RPC 调用
3. 写 inventory link 表，软删旧关联

**验收**：

- [ ] manage-inventory 页面保存成功
- [ ] client 中该方法非 noop

---

### TASK-PRICE-001

**priceList linkProducts + batchPrices**

| 项 | 内容 |
|----|------|
| 优先级 | P1 |
| 状态 | 🔴 |
| Client noop | `linkProducts`, `batchPrices` |
| 已有 | `listPrices` / `addPrices` / `removePrices` 已接 RPC |

**关键文件**：`routes/admin/price-lists.ts`、`routes/admin/price-list-prices.ts`、`client.ts`

**验收**：

- [ ] 价格列表详情可关联产品、批量设价

---

### TASK-INV-001

**库存 batchUpdateLevels**

| 项 | 内容 |
|----|------|
| 优先级 | P1 |
| 状态 | 🔴 |
| Client noop | `batchUpdateLevels`, `batchInventoryItemLocationLevels`, `batchInventoryItemsLocationLevels` |
| 已有 | 单条 `retrieveLevel` / `updateLevel` / `deleteLevel` |

**验收**：

- [ ] 库存详情批量调整 location levels 可用

---

### TASK-RMA-001

**Return 细粒度 API（Phase 1）**

| 项 | 内容 |
|----|------|
| 优先级 | P1 |
| 状态 | 🔴 |
| Client | `returnClient` 约 16 个 noop（见下） |
| 后端 | `routes/admin/returns.ts` 存在，深度不足 |

**Phase 1 最小集（先做创建退货主流程）**：

- `initiateRequest`, `addReturnItem`, `confirmRequest`, `receiveItems`

**其余 noop 清单**：

```
request, dismiss, cancelRequest, updateReturnItem, removeReturnItem,
addReturnShipping, updateReturnShipping, deleteReturnShipping, updateRequest,
initiateReceive, updateReceiveItem, removeReceiveItem,
dismissItems, updateDismissItem, removeDismissItem
```

**参考**：`apps/server/src/workflows/`、`docs/03-business-workflows.mdx`

**验收**：

- [ ] Admin「创建退货」wizard 可走通至少到 confirm
- [ ] Phase 1 涉及 client 方法非 noop

---

### TASK-RMA-002

**Exchange / Claim 细粒度 API**

| 项 | 内容 |
|----|------|
| 优先级 | P1 |
| 状态 | 🔴 |
| 依赖 | TASK-RMA-001 模式可复用 |
| Client noop | exchange 10+、claim 8+、orderEdit 部分 |

**验收**：

- [ ] 换货/索赔创建页主流程可提交（按 MVP 范围定义）

---

### TASK-LOC-001

**Locations fulfillmentSet + shippingOption**

| 项 | 内容 |
|----|------|
| 优先级 | P1 |
| 状态 | 🔴 |
| Client noop | `stockLocation.createFulfillmentSet`, `updateFulfillmentProviders`, `updateSalesChannels`；`orders` 内嵌 shippingOption CRUD |
| 后端 | `fulfillment-sets.ts`、`shipping-options.ts` 表级 CRUD 有，配置 workflow 缺 |

**验收**：

- [ ] Location 详情可创建 service zone / shipping option（至少一条 happy path）

---

### TASK-CAT-001

**分类/合集关联产品 API**

| 项 | 内容 |
|----|------|
| 优先级 | P1 |
| 状态 | 🔴 |
| 缺失 | `POST /admin/product-categories/:id/products`、`POST /admin/collections/:id/products` |
| 页面 | `category-organize`、`collection-add-products` |

**验收**：

- [ ] 向合集/分类添加产品后，产品详情可见关联

---

### TASK-SC-001

**销售渠道 batchProducts**

| 项 | 内容 |
|----|------|
| 优先级 | P1 |
| 状态 | 🔴 |
| Client noop | `salesChannel.batchProducts`, `updateProducts` |

**验收**：

- [ ] 销售渠道详情批量添加/移除产品

---

### TASK-DOC-001

**同步 11 / 14 / 15 / 16 文档**

| 项 | 内容 |
|----|------|
| 优先级 | P2 |
| 状态 | 🟢 2026-05-30 |

**已完成**：

1. `14-admin-api-gap-matrix.md` 整篇重写（零 noop、P0 client 表、Storefront 状态）
2. `11-feature-tracker.mdx` 顶部归档横幅 + 模块级快照；历史统计折叠
3. `15-ai-improvement-tasks.md` §1 快照、§3 任务表、TASK-CLIENT/Q A 索引
4. `16-full-completion-playbook.md` §1 完成度与 Phase 0–6 状态
5. `docs/README.md` 索引说明更新

**验收**：

- [x] 四份文档口径一致（缺口以 14 为准，不信 11 明细行）
- [x] 无「47 处 noop」「import 占位」等过时表述残留于 14/15/16

---

### TASK-STORE-001

**Storefront checkout UI**

| 项 | 内容 |
|----|------|
| 优先级 | P2 |
| 状态 | 🟡 2026-05-30 |
| 已有 | `cart.astro`、`checkout.astro` 三步（信息/配送/支付）；`POST /store/carts/:id/complete` |
| 缺失 | 客户登录/注册页、collections、促销价展示 |

**验收**：

- [x] 列表 → 详情 → 加购 → checkout → 订单确认（最小闭环）
- [ ] 登录态购物车持久化
- [ ] 促销/合集页

---

### TASK-AUTH-001

**登出 / 邀请 / 重置密码**

| 项 | 内容 |
|----|------|
| 优先级 | P2 |
| 状态 | 🟡 2026-05-30 |
| Client | `logout` / `createInvite` 等已接 RPC（非 noop） |
| 后端 | invites 部分路由已有；**无完整 Medusa 邮件流** |

**验收**：

- [x] Admin 登出可用
- [ ] 邀请邮件 + accept 端到端
- [ ] 重置密码邮件流

---

### TASK-CLIENT-001

**P0 client/hooks 对齐（见 14 §P0）**

| 项 | 内容 |
|----|------|
| 优先级 | P0 |
| 状态 | 🟢 2026-05-30 |

**已完成**：claim inbound/outbound、category/collection `updateProducts`、fulfillmentSet service zone、views stub、fulfillment POST/shipment、tax-providers、locales。

**验收**：

- [x] 14 §P0 表全部 ✅ 或 ⚠️（views 为空配置 stub）
- [x] `pnpm --filter=@my-store/server test` 86/86 通过

---

### TASK-QA-001

**Playwright Admin E2E 冒烟**

| 项 | 内容 |
|----|------|
| 优先级 | P2 |
| 状态 | 🔴 |
| 参考 | `docs/12-testing-plan.mdx` |

**范围（最小）**：

1. 登录 → 产品列表可见
2. 打开一条有 line item 的订单详情
3. （可选）产品 create 表单打开无 404

**验收**：

```bash
pnpm --filter=@my-store/admin test:e2e   # 待 scaffold
```

- [ ] CI 或本地可重复跑通 2–3 条用例

---

## 5. client.ts 历史 noop 索引（已归档）

> **2026-05-30：`apps/admin/src/lib/client.ts` 已无 `noop` 引用。**  
> 当前缺口为 **hooks 方法名 / 路径与 client 不对齐**，见 [`14-admin-api-gap-matrix.md`](./14-admin-api-gap-matrix.md) §P0 与 [TASK-CLIENT-001](#task-client-001)。

<details>
<summary>2026-05-29 前 noop 清单（勿用于排期）</summary>

搜索命令（历史）：`grep "noop" apps/admin/src/lib/client.ts`

| 命名空间 | 曾缺方法 |
|---------|-----------|
| product | batchVariantInventoryItems, export, import 等 |
| order | retrieveShippingOption, fulfillmentSet/shippingOption CRUD |
| return / claim / exchange / orderEdit | RMA 细粒度全套 |
| customer / salesChannel / inventory / priceList | batch 关联 |
| fulfillment / auth / locale / taxProvider | 各类 list/create |

**已全部替换为 RPC 调用。**

</details>

## 6. 通用验收清单（每项任务必做）

```markdown
### [TASK-XXX] 验收 — YYYY-MM-DD

- [ ] `pnpm --filter=@my-store/server test` 通过（或说明仅跑相关文件）
- [ ] 相关 Admin 页面无 console error
- [ ] Network 无意外 404
- [ ] `client.ts` 对应方法已接 RPC（非 noop）
- [ ] 已更新 docs/15-ai-improvement-tasks.md 任务状态
- [ ] 若改变缺口范围，已更新 docs/14-admin-api-gap-matrix.md
```

**常用命令**：

```bash
pnpm --filter=@my-store/server test
pnpm --filter=@my-store/server test tests/admin/orders.test.ts
pnpm --filter=@my-store/server test tests/services/order/admin-order.test.ts
pnpm dev   # 本地联调 Admin :5173 + API :9000
```

---

## 7. 推荐执行 waves（给排期用）

| Wave | 任务 ID | 目标 |
|------|---------|------|
| **Wave 1** | ORD-001 → ORD-004 | 订单详情可稳定打开、测试全绿 |
| **Wave 2** | PROD-001, PROD-002 | 产品主流程可用 |
| **Wave 3** | CAT-001, SC-001, INV-001, PRICE-001 | 运营配置闭环 |
| **Wave 4** | RMA-001, RMA-002, LOC-001 | 售后与物流 |
| **Wave 5** | DOC-001 ✅, STORE-001 🟡, AUTH-001 🟡 | 文档已同步；C 端 checkout 最小闭环 |
| **Wave 6（当前）** | **CLIENT-001 ✅**, RMA-002, LOC-001, CAT-001 | 联调深度 |
| **Wave 7** | QA-001, STORE-001 余项, AUTH-001 邮件流 | E2E + C 端账户 |

---

## 8. 维护说明

1. **新增任务**：按 `TASK-{模块}-{序号}` 命名，写入 §3 总览 + §4 详情
2. **完成任务**：状态改 🟢，§4 底部填完成日期；同步 `14-admin-api-gap-matrix.md`
3. **发现新 bug**：在 §1 快照或 §3 追加任务，标 P0/P1/P2
4. **禁止**：未验证就标 🟢；修改 `apps/backend/`；无用户要求时 git commit

---

## 9. 相关文档

| 文档 | 关系 |
|------|------|
| [00-agent-handoff.md](./00-agent-handoff.md) | 硬性规则 |
| [14-admin-api-gap-matrix.md](./14-admin-api-gap-matrix.md) | 模块级对照 |
| [13-architecture-conflicts.mdx](./13-architecture-conflicts.mdx) | C-02 fields、C-03 地址、C-04 totals |
| [07-feature-spec.mdx](./07-feature-spec.mdx) | 功能规格 |
| [12-testing-plan.mdx](./12-testing-plan.mdx) | 测试策略 |
