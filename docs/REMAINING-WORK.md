# 剩余工作

> **核实日期**：2026-05-30  
> **已完成能力** → [PROJECT_STATUS.md](./PROJECT_STATUS.md)

---

## 快速结论

| 问题 | 答案 |
|------|------|
| 能否日常运营？ | **能**（产品、订单、库存、RMA、客户、草稿订单） |
| 等价 Medusa v2 全功能？ | **约 65%** |
| 测试 | `pnpm --filter=@my-store/server test` — 25 文件 / ~183 用例 |
| 最大缺口 | 真实支付、i18n、外部 Provider、Admin 翻译/feature-flags 断链 |

---

## P0 — 若要 C 端真实收款

1. 实现 `StripePaymentProvider`（`apps/server/src/lib/providers/`）
2. 注册 Provider，checkout workflow 改用可配置 ID
3. Storefront `checkout.astro` 接 Stripe.js

---

## P1 — Admin 断链 / 明显半成品

| 项 | 说明 |
|----|------|
| 翻译模块 | `routes/translations/` 有 UI，**未注册路由**；server 无 `/admin/translations` |
| Feature Flags | `hooks/api/feature-flags.tsx` 调 server，**无** `/admin/feature-flags` |
| 税区 metadata | server 有 update，UI 仍占位 |
| GitHub OAuth | `auth.service.ts` 返回 501 |
| 运输选项改价 | 更新 region price 报错 |
| 过期 TODO | `customer-order-section` 创建订单按钮等 |

**处理方式**：二选一 — 补 API + 接线，或隐藏入口。

---

## P2 — 产品化（当前有意未做）

| 项 | 状态 |
|----|:----:|
| Stripe / 真实支付 | ❌ |
| i18n 多语言 | ❌ |
| `<dialog>` 购物车抽屉 | ❌ |
| View Transitions | ❌ |
| Cloudflare adapter | ❌ |
| All-in-One 静态托管 | ❌ |
| SMS / Webhook 通知 | ❌ |
| Handlebars 邮件模板 | ❌ |
| RMA 专用邮件 | ❌ |

---

## P3 — 质量 / 可选

| 项 | 状态 |
|----|:----:|
| Store API `?fields=` | ❌ |
| 降低 Admin `@ts-nocheck` | 🟡 |
| server 全量 `tsc` 零错 | 🟡 |
| 事件持久化 | ❌ |
| Admin RMA Playwright | ❌（仅 smoke E2E） |
| promotions / claims 单测 | 部分缺失 |

---

## 外部 Provider（全部 NOOP）

`apps/server/src/lib/providers/index.ts` — Payment、Shipping、Notification、Inventory 均为占位。接 Stripe/Shippo/WMS 时在此替换。

Checkout **未**调用 Inventory Provider 做预留/扣减。

---

## 维护

完成某项后：从本文删除对应行，并更新 `PROJECT_STATUS.md`。
