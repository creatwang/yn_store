---
name: project-status
description: P2 收尾进度和项目完成度总览
metadata:
  type: project
---

## 2026-06-01 P2 收尾进度

### 已完成 ✅

| 功能 | 说明 |
|------|------|
| SMTP 邮件系统 | Nodemailer 替换 dev-mail.ts，未配置时回退 console.log |
| Storefront 价格展示 | 产品列表/详情/购物车/结账全部显示价格，后端 price→price_set 链联表 |
| Storefront 账户页 | 个人信息 + 订单历史 + 收货地址（CRUD）三 Tab |
| Checkout 优惠码 | 百分比/固定折扣，前端输入框，后端 adjustment 写入 |
| Playwright E2E | 4 条 smoke（登录/产品列表/订单列表/订单详情）+ CI workflow |
| Storefront 结账运费 | 不再硬编码 +10，用选中配送方式实际金额 |

### 待做 📋

- OAuth / 社交登录（零代码）
- Storefront 搜索 + 筛选 + 分页
- Admin 24 个缺失组件（表格 hooks）
- Playwright CI 需配 DATABASE_URL secret
- 文档数据修正（@ts-nocheck ~170→1143）
- 真实支付网关（Stripe 等）

### 测试现状

- 16 个测试文件 / 101 条用例全绿（单 worker 避免 Supabase pool 耗尽）
- carts.test.ts 新增 5 条优惠码用例（11 total）
- Playwright 4 条 smoke 全部通过

### 服务器端口

- API 后端 :9000（Hono）
- Admin :5173（Vite，冲突时 +1）
- Storefront :4321（Astro）

**Why:** 每次新对话总结当前进度，避免重扫全项目。
**How to apply:** 接手工作前先读这条，了解哪些做了哪些没做。
