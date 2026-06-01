---
name: ecommerce-c-end
description: >-
  Astro C 端商城全栈 Skill（my-medusa-store-hono）。原生 script/HTML5 优先、Preact 仅
  checkout、禁止 React。含 adapter 部署、Content Loader、Hybrid、Nano Stores、
  图片、SEO、测试。进度见 implementation-status.md。
---

# Astro C 端商城 — Skill 入口

> 项目：`D:\webstormProject\my-medusa-store-hono` · `apps/storefront` → Hono `/api/store/*`  
> **实现进度（先读）→ [implementation-status.md](implementation-status.md)**

---

## 核心三条

1. **语义 HTML 优先** → [native-html-components.md](native-html-components.md)（`<output>` 价、`<fieldset>` 规格）
2. **UI 原生 script 优先** → [islands-strategy.md](islands-strategy.md)（禁止 React 岛）
3. **交易走 Hono Store API** → [cart-checkout-auth.md](cart-checkout-auth.md)（禁止 js-sdk）

---

## 快速导航

| 你要做… | 读这个 |
|---------|--------|
| **当前做了什么 / 缺什么** | [implementation-status.md](implementation-status.md) |
| **目录命名 /  env / 禁止项** | [storefront-conventions.md](storefront-conventions.md) |
| 全貌 / 23 模块 | [full-tech-stack.md](full-tech-stack.md) |
| 功能 × Astro 适配 × ROI 路线 | [adoption-matrix.md](adoption-matrix.md) |
| UI 岛（script / dialog / Preact） | [islands-strategy.md](islands-strategy.md) |
| HTML 原生标签清单 | [native-html-components.md](native-html-components.md) |
| 图片 / Sharp / Picture | [image-optimization.md](image-optimization.md) |
| SEO / sitemap / JSON-LD | [seo-and-metadata.md](seo-and-metadata.md) |
| 加购 / cart / checkout / 登录 | [cart-checkout-auth.md](cart-checkout-auth.md) |
| middleware / 会话安全 | [middleware-security.md](middleware-security.md) |
| Content Loader / Hybrid | [official-patterns.md](official-patterns.md) |
| 可复制代码 | [code-templates.md](code-templates.md) |
| Store API / Webhook / 部署 | [reference.md](reference.md) |
| **Adapter / Hybrid 部署** | [adapter-deployment.md](adapter-deployment.md) |
| MVP → 目标迁移步骤 | [migration-checklist.md](migration-checklist.md) |
| 测试 Playwright / Vitest | [testing.md](testing.md) |
| Astro 官方 416 页索引 | [astro-docs-index.md](astro-docs-index.md) |

---

## 23 模块 → 文档映射

| # | 模块 | 主文档 |
|---|------|--------|
| 1 | 总架构 | full-tech-stack §0 |
| 2 | Content Loader | official-patterns §1 · code-templates |
| 3 | Hybrid / 注水 | official-patterns §2 |
| 4 | Islands | islands-strategy |
| 5 | Nano Stores | islands-strategy §5 · cart-checkout-auth |
| 6 | 图片 | image-optimization |
| 7 | 商品目录 | adoption-matrix · code-templates |
| 8 | 购物车 | cart-checkout-auth |
| 9 | 结算 | cart-checkout-auth |
| 10 | 支付 | full-tech-stack §10 |
| 11 | 认证 | cart-checkout-auth · middleware-security |
| 12 | 会员订单 | reference |
| 13 | i18n | full-tech-stack §13 · seo-and-metadata §7 |
| 14 | SEO | seo-and-metadata |
| 15 | Actions | full-tech-stack §15 |
| 16 | 中间件安全 | middleware-security |
| 17 | 字体 | full-tech-stack §17 |
| 18 | View Transitions | adoption-matrix §F |
| 19 | 测试 | testing |
| 20 | 部署 | reference · image-optimization §10 |
| 21 | Webhook | reference |
| 22 | 错误 UX | cart-checkout-auth §8 |
| 23 | 目录结构 | storefront-conventions |

---

## 项目硬边界

```
storefront ──REST──► server:9000/api/store/*
```

- ✅ `lib/cart.ts` / `lib/auth.ts`、`PUBLIC_API_URL`、`<Image />`、nanostores  
- ❌ `@medusajs/js-sdk`、Hono RPC、storefront 直连 DB、全站 React Provider  

Server 改动：`validators → service → routes/store`

---

## 已完成 vs 待办（摘要）

| 已完成 ✅ | 待办 ❌ |
|-----------|---------|
| ProductAddToCart + output/fieldset | hybrid + prerender false |
| ProductCardImage / ProductDetailPicture | Content Loader |
| image.domains + Sharp | sitemap + JSON-LD |
| CartBadge + CartCountInit | middleware |
| 移除 React | Playwright E2E |

详情：[implementation-status.md](implementation-status.md)

---

## 本地联调

```powershell
cd D:\webstormProject\my-medusa-store-hono
pnpm dev
pnpm build --filter=@my-store/storefront
```

---

## 禁止事项

- ❌ 目标态下页面内 fetch 商品/catalog（应用 Loader）
- ❌ 整页 client:load Preact/React 根
- ❌ `astro add react` / 加购用 `.tsx` 岛
- ❌ 商品图裸 `<img>`（应用 Image/Picture）
- ❌ SSR 页漏 `prerender = false`（hybrid 后）
- ❌ Astro Session 与 Medusa cart 双写
- ❌ 无意义 div 替代语义标签（见 native-html-components）

---

## 文档文件树

```
ecommerce-c-end/
├── SKILL.md                    ← 本文件（入口）
├── implementation-status.md    ← ★ 进度单一事实来源
├── storefront-conventions.md   ← ★ 工程约定
├── islands-strategy.md         ← UI 岛
├── native-html-components.md   ← 语义 HTML
├── image-optimization.md       ← 图片 / Image Service
├── adapter-deployment.md       ← ★ Astro adapter / Hybrid 部署
├── seo-and-metadata.md         ← SEO / JSON-LD / sitemap
├── cart-checkout-auth.md       ← 交易 / 认证流程
├── middleware-security.md      ← 中间件 / 会话
├── testing.md                  ← Playwright / Vitest
├── full-tech-stack.md          ← 23 模块全栈
├── adoption-matrix.md          ← 适配矩阵
├── official-patterns.md        ← Loader / Hybrid
├── code-templates.md           ← 可复制模板
├── reference.md                ← API / 运维
├── migration-checklist.md      ← 分阶段迁移
├── astro-docs-index.md
└── astro-docs-zh-cn-urls.txt
```
