---
name: project-status
description: 项目完成度快照（代码核实）
metadata:
  type: project
---

## 2026-06-01 状态

### 已完成
- B 端 Admin: 产品/订单/客户/库存/履约/RMA 主线全通
- C 端 Storefront: Astro 5 Hybrid, Content Loader, 购物车+结算闭环
- 后端 API: 60+ admin + 12 store + webhook 路由
- client.ts: 零 noop, 全部 hooks 对齐
- 品牌配置: @my-store/config (BRAND="Yanan Store")
- Views: DB 持久化
- Uploads: retrieve + delete 真实实现
- 邮件: Resend API + 完整模板
- 测试: 17 文件 / 147 条全绿

### 仍缺
- Stripe 支付
- i18n 多语言
- View Transitions
- 促销规则引擎 (表级 CRUD 有)
- @ts-nocheck ~250 文件 (P3)

**Why:** 代码核实后再写,替代过时文档。
**How to apply:** 做新功能前先看 docs/PROJECT_STATUS.md 和 [[user-prefs]].
