# Admin UI 迭代 01 — 订单 / RMA 体验债

> **范围**：`apps/admin` Medusa 拷贝层 TODO（不含 P2：Stripe / i18n / storefront）  
> **周期建议**：**2 周**（1 人全栈）或 **1 周**（2 人：后端 3d + 前端 7d）  
> **前提**：Store API / Admin API 主线已通（见 `PROJECT_STATUS.md`）

---

## 目标（本期 Done 的定义）

1. 运营可在订单详情 **查看/添加内部备注**，时间线有备注事件。  
2. 订单列表可按 **支付状态 / 履约状态** 筛选（与列表列展示一致）。  
3. **索赔 / 换货 / 订单编辑** 主流程无「点了没反应」的占位逻辑。  
4. 退货创建/收货、分配库存有基本校验与错误提示。  
5. 相关 E2E 或 Admin 手测清单全绿。

**不做**：商品 fields 排除清理、税区/Profile 杂项、MFA、全量 `tsc` 零错。

---

## 迭代结构（4 个 Sprint 内切片，按序执行）

```
S1 备注 + 列表筛选（地基）
  → S2 订单编辑 + 退货
    → S3 索赔（最重）
      → S4 换货 + 分配库存 + 收尾
```

---

## S1 — 备注与时间线 + 列表筛选（3–4 人日）✅ 已完成（2026-06-01）

### 1.1 订单备注（Server 已有，接 Admin）

| 项 | 说明 |
|----|------|
| API | ✅ `POST /api/admin/orders/:id/notes`（`metadata.admin_notes`） |
| Admin | `lib/client.ts` 增 `sdk.admin.order.addNote` |
| UI | `order-activity-section` / `order-timeline` 恢复备注 UI；表单提交后 invalidate `orders` |
| 验收 | 详情页添加备注 → 刷新仍可见；时间线出现备注节点 |

**文件**：`apps/admin/src/lib/client.ts`、`hooks/api/orders.tsx`、`routes/orders/order-detail/components/order-activity-section/*`

### 1.2 订单列表筛选

| 项 | 说明 |
|----|------|
| 现状 | `use-order-table-filters.tsx` 注释掉 payment/fulfillment filter |
| 依赖 | 列表 DTO 含 `payment_status` / `fulfillment_status`（`presentAdminOrders` 已聚合则仅开 UI） |
| Admin | 启用 filter chips；`order-table-adapter` 传 query |
| Server（若缺） | `GET /admin/orders?payment_status=&fulfillment_status=` 过滤 |
| 验收 | 选「已支付 / 已发货」等，列表结果变化正确 |

**文件**：`hooks/table/filters/use-order-table-filters.tsx`、`order-list-table/*`、`services/order.service.ts`（list 条件）

### 1.3 小清理

- 删除 `order-receive-return.tsx` 过期 TODO（404 已修）  
- `order-detail.tsx`：若 server 支持 `order.items` 排序字段则改 API，否则保留 JS sort 并注释说明

---

## S2 — 订单编辑 + 退货（4–5 人日）✅ 核心已接（2026-06-01）


### 2.1 订单编辑请求（`/orders/:id/edits`）

| 项 | 说明 |
|----|------|
| Server | `POST /admin/order-edits/:id/request` 接收 body：`internal_note?`、`send_notification?`；`confirm` 时若 `send_notification` 走 `notificationService` |
| Admin | `order-edit-create-form.tsx` 提交 `note` + Switch；`useRequestOrderEdit` 传 payload |
| 验收 | 勾选通知 + 填备注 → request/confirm 后客户收到邮件（Resend 或 dev log） |

**文件**：`routes/admin/order-edits.ts`、`order-edit.service.ts`、`order-edit-create-form.tsx`、`hooks/api/order-edits.tsx`

### 2.2 编辑加品库存提示

| 项 | 说明 |
|----|------|
| Admin | `add-order-edit-items-table.tsx` 调用现有 inventory level API，超库存禁用或 warning |
| 验收 | 库存不足时无法提交或明确报错 |

### 2.3 创建退货（`/orders/:id/returns`）

| 项 | 说明 |
|----|------|
| Server | `GET /admin/stock-locations` 已存在；return 创建支持 `location_id` |
| Admin | `return-create-form.tsx`：仓库下拉按 `location_id` 过滤 |
| Admin | 退货原因：接 `GET /admin/return-reasons` 下拉（替换 TODO） |
| 验收 | 选仓库/原因可保存；创建后 preview 正确 |

### 2.4 收货退货（`/orders/:id/returns/:rid/receive`）

| 项 | 说明 |
|----|------|
| Admin | `dismissed-quantity.tsx` 超量校验 + 中文错误 |
| 验收 | 收货数量 > 可收数量时阻止提交 |

---

## S3 — 索赔 Claim（5–6 人日，本期核心）✅ 已完成（2026-06-01）

### 3.1 厘清 Medusa 语义

| UI 操作 | 应对 API（当前 server） |
|---------|-------------------------|
| 提交索赔请求 | `POST /admin/claims/:id/request` ✅ |
| 取消请求 | `POST /admin/claims/:id/request/cancel` ✅ |
| 「Confirm」按钮 | 核对是否应调 `request` 或缺 `confirm` 路由 |

**任务**：对照 Medusa Admin `sdk.admin.claim.*`，在 `client.ts` 补齐缺失方法；无路由则在 `claims.ts` 增加 `POST /:id/confirm`（若业务需要）。

### 3.2 Claim 表单接线

| 项 | 说明 |
|----|------|
| Admin | 实现 `useClaimConfirmRequest` / update 与 UI 按钮一致（去掉 TODO 占位） |
| Admin | `claim-outbound-section`：shipping options 列表接 API（暂用客户端 filter，文档记录 API boolean filter 为 S4+） |
| Admin | 提交前 **库存校验**（与 exchange 共用 helper） |
| 验收 | 完整走通：创建 claim → 添 inbound/outbound → request → 详情页 claim 区块状态正确 |

**文件**：`order-create-claim/**`、`hooks/api/claims.tsx`、`routes/admin/claims.ts`

---

## S4 — 换货 + 分配库存 + 收尾（4–5 人日）✅ 已完成（2026-06-01）

### 4.1 换货（`/orders/:id/exchanges`）

| 项 | 说明 |
|----|------|
| Admin | 复用 S3 库存 helper；`exchange-outbound-item` 显示可发数量上限 |
| Admin | outbound payload 类型对齐 `client.ts` / validators |
| 验收 | 换货创建 → request → 订单 preview 显示 exchange |

### 4.2 分配库存（`/orders/:id/allocate-items`）

| 项 | 说明 |
|----|------|
| Admin | 空状态 UI；提交失败 toast |
| Server（可选） | bulk allocate 留 **迭代 02**，本期仅 UX |
| 验收 | 无库存时有提示；分配成功回详情履约区可见 |

### 4.3 横切收尾

| 项 | 说明 |
|----|------|
| `fulfillment-status-cell` | 与列表筛选联动后移除 TODO 注释 |
| 手测 | 下表「回归清单」 |
| 文档 | 更新 `REMAINING-WORK.md` §Admin UI |

---

## 人日汇总

| 切片 | 人日 | 风险 |
|------|:----:|------|
| S1 备注+筛选 | 3–4 | 低 |
| S2 编辑+退货 | 4–5 | 中 |
| S3 索赔 | 5–6 | **高**（API 语义对齐） |
| S4 换货+收尾 | 4–5 | 中 |
| **合计** | **16–20** | 建议留 20% buffer |

---

## 回归手测清单（每期结束跑一遍）

- [ ] `/app/orders` 筛选 payment + fulfillment  
- [ ] `/app/orders/:id` 添加备注、时间线可见  
- [ ] `/app/orders/:id/edits` 备注 + 通知开关  
- [ ] `/app/orders/:id/returns` 创建（仓库+原因）  
- [ ] `/app/orders/:id/returns/:rid/receive` 收货校验  
- [ ] `/app/orders/:id/claims` 全流程  
- [ ] `/app/orders/:id/exchanges` 全流程  
- [ ] `/app/orders/:id/allocate-items` 分配履约  

---

## 建单与路由补全（2026-06-01）✅

| 项 | 说明 |
|----|------|
| 草稿订单 | 侧栏 **草稿订单**；列表 / 创建 / 详情（地区、客户/邮箱、搜商品加行、自定义行、配送方式、摘要、转正式单） |
| 订单子路由 | `app.tsx` 注册 `edits` / `returns` / `exchanges` / `claims` / `allocate-items` 等（RMA 手测不再 404） |
| 订单列表 | **创建草稿订单** 快捷入口 |
| 测试 | `apps/server/tests/admin/draft-orders.test.ts` |

---

## 迭代 02（ backlog，本期不做）

- Claim/Exchange shipping option **服务端 boolean 筛选**  
- `order-allocate-items` bulk + workflow 回滚  
- 商品模块 fields 排除统一（~20 文件）  
- `order-timeline` dismissed quantity、transfer 邮件展示等细项  
- Admin Playwright 覆盖上述路径  

---

## 分工建议（2 人）

| 角色 | S1 | S2 | S3 | S4 |
|------|----|----|----|-----|
| **后端** | list 筛选参数；notes 文档 | order-edit body + 通知 | claims 路由对齐 | — |
| **前端** | 备注 UI + 筛选 | 编辑/退货表单 | claim 表单 | exchange + allocate |

---

## 相关路径索引

```
apps/admin/src/routes/orders/
  order-list/              # S1
  order-detail/            # S1
  order-create-edit/       # S2
  order-create-return/     # S2
  order-receive-return/    # S2
  order-create-claim/      # S3
  order-create-exchange/   # S4
  order-allocate-items/    # S4
```

维护：完成子项后在本文件对应节打 ✅，并同步 `REMAINING-WORK.md`。
