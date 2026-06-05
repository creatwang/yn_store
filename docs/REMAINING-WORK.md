# 剩余工作与真实状态审计

> **核实日期**：2026-06-04  
> **已完成能力矩阵** → [PROJECT_STATUS.md](./PROJECT_STATUS.md)

---

## 1. 快速结论

| 问题 | 答案 |
|------|------|
| 能否日常运营？ | **能** |
| 等价 Medusa v2 全功能？ | **约 65%**（P2 支付/i18n 仍缺） |
| 测试是否全绿？ | **是** — 23 文件 / 182 条（2026-06-04 实跑） |
| 最大剩余风险？ | **P2 产品化** + 部分 Admin UI 拷贝层 TODO + server `tsc` 历史债 |

---

## 2. 本轮已完成（2026-06-02）

### P0 — 事务与回滚

| 项 | 状态 |
|----|:----:|
| `lib/transaction.ts` → `runInTransaction()` | ✅ |
| `cart.applyPromo` / `removePromo` | ✅ 事务 |
| `order.create` / `cancel` | ✅ 事务 |
| `fulfillment.cancel` | ✅ 事务 |
| `return.addReturnItems` / `receive` | ✅ 事务 |
| `order-edit.confirm` / `cancel` | ✅ 事务 |
| `product-import.confirm` | ✅ 事务 |
| `order.requestTransfer` | ✅ `dispatchRollback` |
| `order.addLineItem` | ✅ 事务 |
| Workflow 8 条 | ✅ 已接线（维持） |

### P1 — 业务深度

| 项 | 状态 |
|----|:----:|
| `return.receive` 404 + 完整 `getById` 响应 | ✅ |
| `return.received` 事件 | ✅ |
| `order-edit.*` 事件 | ✅ requested/confirmed/canceled |
| 订单导出分页（500/批） | ✅ |
| `POST /admin/orders/:id/notes` | ✅ metadata.admin_notes |
| Admin 通知路由 → `notification.service` + resend | ✅ |
| claim/exchange/return shipping → `order_change_action` | ✅（2026-06-03） |

### P3 — fields

| 项 | 状态 |
|----|:----:|
| `GET /admin/orders/:id?fields=` | ✅ |
| `GET /admin/products/:id?fields=` | ✅（原有） |

### C 端（非 P2）

| 项 | 状态 |
|----|:----:|
| Vercel / Docker / CI | ✅（前序已落地） |

---

## 3. 仍待办 — 仅 P2 与可选

### P2 — 明确排除本轮（用户要求跳过）

| 项 | 状态 |
|----|:----:|
| Stripe / 真实支付 | ❌ |
| i18n 多语言 | ❌ |
| `<dialog>` 购物车抽屉 | ❌ |
| View Transitions | ❌ |
| Cloudflare adapter | ❌ |
| All-in-One 静态托管 | ❌ |

### P2 边缘（通知深化，非阻塞）

| 项 | 状态 |
|----|:----:|
| SMS / Webhook 通知渠道 | ❌ |
| Handlebars 模板引擎 | ❌ |
| RMA 专用邮件模板 | ❌ |

### P3 — 可选质量

| 项 | 状态 |
|----|:----:|
| `@ts-nocheck` ~250（admin 拷贝层） | 🟡 |
| Store API `fields` 支持 | ❌ |
| `apps/server` 全量 `tsc --noEmit` 零错 | 🟡 有历史 TS 债 |
| Vitest Loader（storefront） | ❌ 可选 |

### Admin UI 迭代 01（2026-06-01）

| 切片 | 状态 |
|------|:----:|
| S1 备注 + 列表筛选 | ✅ |
| S2 订单编辑 + 退货 | ✅ 核心 |
| S3 Claim 全流程 | ✅ |
| S4 Exchange + 分配库存 UX | ✅ |

详见 [ADMIN-UI-ITERATION-01.md](./ADMIN-UI-ITERATION-01.md)。**Admin 建单**：草稿订单 UI + 订单子路由已接（2026-06-01）。**迭代 02（2026-06-03）**：`GET /admin/shipping-options?is_return` / `admin_only` 服务端筛选、`POST /admin/reservations/batch` + workflow 回滚、`GET /admin/orders/:id/shipping-options` 带筛选。

---

## 4. 勿再使用的过期文档

| 文档 | 改用 |
|------|------|
| `11-feature-tracker.mdx` | PROJECT_STATUS |
| `00-agent-handoff.md` 旧 §9「已过期」占位 | 已改为 §9 实现快照（2026-06-02） |
| `ecommerce-c-end/adoption-matrix.md` 搜索 ❌ | 已修正为 ✅ |

---

## 5. 维护约定

| 动作 | 更新 |
|------|------|
| 新 API | PROJECT_STATUS §API 矩阵 |
| C 端 | `ecommerce-c-end/implementation-status.md` |
| 完成 P2 项 | 从本文 §3 删除 |

---

## 6. 相关索引

- [workflow-plan.md](./workflow-plan.md)
- [13-architecture-conflicts.mdx](./13-architecture-conflicts.mdx)
- [ecommerce-c-end/implementation-status.md](./ecommerce-c-end/implementation-status.md)
