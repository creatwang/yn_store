# C 端商城全栈技术方案（完整版）

> 项目：`D:\webstormProject\my-medusa-store-hono` · C 端 `apps/storefront`  
> 后端：Hono `/api/store/*` · 对齐 Medusa v2.15.3 REST  
> 官方依据：Astro zh-cn 416 页（见 [astro-docs-index.md](astro-docs-index.md)）

---

## 0. 总架构

```
                    ┌─────────────────────────────────────┐
                    │  CDN / Vercel / CF Pages (storefront) │
                    │  Astro hybrid · SSG 目录 + SSR 交易   │
                    └──────────────┬──────────────────────┘
                                   │ REST
                    ┌──────────────▼──────────────────────┐
                    │  Hono server :9000                   │
                    │  /api/store/*  /api/auth/customer/*  │
                    └──────────────┬──────────────────────┘
                                   │ Drizzle
                    ┌──────────────▼──────────────────────┐
                    │  PostgreSQL (Medusa 表结构)          │
                    └─────────────────────────────────────┘
```

| 原则 | 说明 |
|------|------|
| 目录/SEO | SSG + Content Loader |
| 交易/会话 | SSR + Store API |
| 类型安全 | Zod（server validators + Content schema） |
| 零 JS 优先 | Islands 按需激活 |
| 权威数据 | Server cart/order，非纯前端状态 |

---

## 1. 数据层 — Content Layer + Loader

**官方**：`content.config.ts` + 自定义 Loader + Zod；页面用 `getCollection` / `getEntry`。

| 集合 | Loader 数据源 | 用途 |
|------|---------------|------|
| `products` | `GET /api/store/products` 分页 | 首页、PDP、搜索索引 |
| `collections` | `GET /api/store/collections` | 集合页 |
| `promotions` | `GET /api/store/promotions` | 促销页（可选） |

**禁止**：各 `.astro` 页面各自 `fetch` 商品列表（目标态）。

**变价/库存**：Loader 只存 build 快照；运行时注水（§2）。

→ 模板：[code-templates.md](code-templates.md) · 官方：[content-loader-reference](https://docs.astro.build/zh-cn/reference/content-loader-reference/)

---

## 2. 渲染策略 — Hybrid + 注水 + 流式

### 2.1 astro.config

```javascript
export default defineConfig({
  output: "hybrid",
  adapter: vercel() /* 或 node / cloudflare，按部署 */,
})
```

### 2.2 页面分界

| 渲染 | 路由 | 声明 |
|------|------|------|
| **SSG** | `/`, `/products/[handle]`, `/collections/*`, `/promotions`, `/search` | `getStaticPaths` |
| **SSR** | `/cart`, `/checkout`, `/account`, `/login`, `/register` | `export const prerender = false` |

### 2.3 静态-动态注水（PDP）

- SSG：`title`、描述、`<Picture />`、fallback 价（SEO）
- Client：`fetch(/api/store/products/:handle)` 刷新价/库存
- 用 `is:inline define:vars`，失败保留 fallback

### 2.4 流式 SSR（官方 recipes）

SSR 页勿在 frontmatter 串行 `await` 所有 fetch；拆成子组件并行：

```astro
<h1>购物车</h1>
<CartLineItems />   <!-- 内部 await -->
<CartSummary />
```

→ [streaming-improve-page-performance](https://docs.astro.build/zh-cn/recipes/streaming-improve-page-performance/)

### 2.5 Server Islands（可选）

个性化推荐、登录后横幅：`server:defer` 延迟服务端渲染块。  
→ [server-islands](https://docs.astro.build/zh-cn/guides/server-islands/)

---

## 3. UI 架构 — 原生 script 优先（非 React 岛）

> **完整规范**：[islands-strategy.md](islands-strategy.md)

| 优先级 | 方案 | 商城示例 |
|--------|------|----------|
| 🥇 | **语义 HTML 原生标签** | `<output>` 价、`<fieldset>` 规格、`<time>` 促销 → [native-html-components.md](native-html-components.md) |
| 🥇 | Astro + 原生 `<script>` | 加购、角标、cart/checkout（与现有 MVP 一致） |
| 🥈 | HTML5 `<dialog>` / `<details>` | 弹窗、FAQ、规格折叠 |
| 🥉 | Preact `client:visible` | **仅** checkout 复杂块 |
| 🚫 | React 岛 | **禁止** |

Nano Stores 在原生 `<script>` 中直接 `$cartCount.subscribe`，无需 Preact。

---

## 4. 客户端状态 — Nano Stores

**官方推荐**跨 Islands 通信用 Nano Stores（非 Redux/Context）。

| Store | 类型 | 职责 |
|-------|------|------|
| `$cartCount` | atom | Header 角标（乐观 UI） |
| `$cartId` | atom | 同步 localStorage |
| `$isCartOpen` | atom | 抽屉开关 |
| `cartItems` | map | 可选本地摘要 |

**权威**：server `cart_id` + `POST /store/carts/*`；Nano 只做 UI 层。

→ [sharing-state-islands](https://docs.astro.build/zh-cn/recipes/sharing-state-islands/) · [code-templates.md](code-templates.md)

---

## 5. 图片与媒体

| 场景 | 方案 |
|------|------|
| 商品图 | `<Image />` / `<Picture formats={['avif','webp']} />` |
| 远程 Medusa URL | `image.domains` + `remotePatterns` |
| CF 无 Sharp | `passthroughImageService()` |
| DAM | Cloudinary `astro-cloudinary` 或 OSS + 授权远程 |
| 视频 | Mux / 外链（Astro 无原生 video 优化） |

→ **专章**：[image-optimization.md](image-optimization.md)

---

## 6. 商品目录

| 能力 | Store API | 页面 | 渲染 |
|------|-----------|------|------|
| 列表 | `GET /store/products?limit&offset` | `/` | SSG |
| 详情 | `GET /store/products/:handle` | `/products/[handle]` | SSG + 注水 |
| 集合 | `GET /store/collections`, `/:id` | `/collections/*` | SSG |
| 促销 | `GET /store/promotions` | `/promotions` | SSG |
| 搜索 | 待建 `?q=` | `/search` | SSG 或 SSR |

**过滤**：仅展示 `status = published`（server 保证）。

---

## 7. 购物车

### 7.1 生命周期

```
1. POST /store/carts → cart.id → localStorage + $cartId
2. POST .../line-items（variant_id, quantity）
3. GET .../carts/:id 展示
4. 登录 → linkCartToCustomer(cartId)
5. complete 后 clearCartId
```

### 7.2 实现选型

| 方案 | 适用 |
|------|------|
| **A（当前 MVP）** | `lib/cart.ts` + 内联 script |
| **B（目标）** | Nano Stores + Islands + `apiFetch` |
| **C（Astro 原生）** | Sessions + Actions（需 adapter SSR，cart 存 session） |

my-medusa-store-hono **推荐 B**：cart 仍在 Medusa 表，不用 Astro Session 替代 server cart。

→ 流程专章：[cart-checkout-auth.md](cart-checkout-auth.md)

---

## 8. 结算（Checkout）

**SSR 多步**（已实现 `checkout.astro`）：

| 步 | API |
|----|-----|
| 联系信息 | `POST /store/carts/:id`（email、地址） |
| 配送 | `GET /store/shipping-options` + 选择 |
| 促销 | cart 更新 promo codes |
| 支付 | `POST /store/payment-collections` + session |
| 完成 | `POST /store/carts/:id/complete` |

**目标**：checkout 外壳仍用原生 `<script>` 多步；极复杂块可选 Preact `client:visible`。

→ [cart-checkout-auth.md](cart-checkout-auth.md) §5

---

## 9. 支付

### 9.1 Medusa / Hono（当前）

- Provider：`pp_system_default`（手动/线下）
- API：`/store/payment-providers`, `/store/payment-collections`

### 9.2 Astro 官方电商集成（扩展）

| 方案 | 类型 | 集成方式 |
|------|------|----------|
| **Stripe** | 自建 checkout | 原生 `<script>` 动态 import Stripe.js，或 Preact `client:only` |
| **Lemon Squeezy** | 叠加层 | `lemon.js` + `lemonsqueezy-button` |
| **Paddle** | 叠加层 | `paddle.js` + `paddle_button` |
| **Snipcart** | 全功能 cart | `snipcart-add-item` 或 `@lloydjatkinson/astro-snipcart` |

**选型**：

- 数字商品/订阅 → Lemon / Paddle overlay
- 自建 Medusa 购物车 → **Stripe Payment Element** 接 Hono payment provider
- 快速 MVP 全托管 → Snipcart（与 Medusa 双轨需评估）

→ [ecommerce 指南](https://docs.astro.build/zh-cn/guides/ecommerce/)

---

## 10. 认证与会话

### 10.1 当前（my-medusa-store-hono）

```
POST /api/auth/customer/emailpass → JWT
POST /api/store/customers/register
Authorization: Bearer → Store API
localStorage: storefront_customer_token
```

`lib/auth.ts`：`loginCustomer`, `registerCustomer`, `linkCartToCustomer`

### 10.2 Astro 官方选项（若重构 storefront 自带 auth）

| 方案 | 说明 |
|------|------|
| **保持 Hono JWT** | ✅ 推荐，与 Medusa customer 表一致 |
| Better Auth | Astro API route `[...all]` + middleware |
| Clerk | `@clerk/astro` 组件 + middleware |
| Lucia | 自建 session（与 Hono 重复，不推荐双栈） |

### 10.3 路由保护（SSR 页）

**方案 A**：middleware 读 Bearer cookie，转发验证 Hono  
**方案 B**：页面 script 无 token 则 `location.href = '/login'`

```typescript
// src/middleware.ts（目标）
export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname
  if (path.startsWith("/account") && !context.cookies.get("customer_token")) {
    return context.redirect("/login")
  }
  return next()
})
```

→ [authentication](https://docs.astro.build/zh-cn/guides/authentication/) · [middleware](https://docs.astro.build/zh-cn/guides/middleware/)

### 10.4 Astro Sessions（可选，非默认）

Astro 5.7+ 服务端 session（Redis 等），适合 **纯 Astro 栈** 存 cart 草稿；  
与 Medusa server cart **二选一**，勿双写。

→ [sessions](https://docs.astro.build/zh-cn/guides/sessions/)

---

## 11. 会员与订单

| 页面 | API | 渲染 |
|------|-----|------|
| `/account` | `GET /store/orders`（带 Bearer） | SSR |
| 资料编辑 | `POST /store/customers/me` | SSR island |

空态、错误态必须可见（Selectable 或 inline 错误，非仅 console）。

---

## 12. 国际化（i18n）

**现状**：硬编码中文。

**官方配方**：

1. `src/i18n/ui.ts` — 文案字典
2. `src/i18n/utils.ts` — `getLangFromUrl`, `useTranslations`
3. 路由 `/[lang]/...` 或隐藏默认语言
4. `<html lang={lang}>`
5. 商品内容多语言 → Loader 按 locale 拉取或 Medusa 翻译字段

→ [i18n recipe](https://docs.astro.build/zh-cn/recipes/i18n/) · [astro-i18n 模块](https://docs.astro.build/zh-cn/reference/modules/astro-i18n/)

---

## 13. SEO 与可发现性

> **专章**：[seo-and-metadata.md](seo-and-metadata.md) · **进度**：[implementation-status.md](implementation-status.md) §6

**语义 HTML**：优先使用 [native-html-components.md](native-html-components.md) 列出的原生标签

| 项 | 方案 |
|----|------|
| title / description | 每页 `BaseLayout` props |
| Canonical | `<link rel="canonical">` |
| Sitemap | `@astrojs/sitemap` + `getStaticPaths` 商品 URL |
| robots | `public/robots.txt` |
| JSON-LD | PDP `Product`、列表 `ItemList` |
| OG 图 | `getImage()` 生成 1200×630 |
| hreflang | i18n 多语言时 |

```javascript
// astro.config.mjs
import sitemap from "@astrojs/sitemap"
integrations: [sitemap()]
```

→ [sitemap 集成](https://docs.astro.build/zh-cn/guides/integrations-guide/sitemap/)

---

## 14. Astro Actions（可选 API 层）

替代部分 `fetch` + 手写 JSON：

```typescript
// src/actions/index.ts
export const server = {
  addToCart: defineAction({
    input: z.object({ variantId: z.string(), qty: z.number() }),
    handler: async (input, ctx) => {
      // 调 Hono 或 proxy Store API
    },
  }),
}
```

**适用**：表单 POST、Zod 校验、类型安全客户端调用。  
**不适用**：SSG build-time Loader。

→ [actions 指南](https://docs.astro.build/zh-cn/guides/actions/)

---

## 15. 中间件与安全

|  Concern | 做法 |
|----------|------|
| CORS | Server `STORE_CORS_ORIGIN` |
| 鉴权路由 | middleware redirect |
| CSRF | Actions 内置；纯 fetch 用 SameSite cookie |
| 远程图 | `image.domains` 白名单 |
| JWT | httpOnly cookie（目标）优于 localStorage |
| 速率限制 | Hono middleware（server 侧） |

---

## 16. 字体与样式

| 项 | 方案 |
|----|------|
| CSS | Tailwind（已装） |
| 字体 | Astro Fonts API（`fontProviders.fontsource()`）自托管，避免 Google 第三方 |
| 预加载 | 仅 above-the-fold 1 款字体 `<Font preload />` |
| Tailwind 4 | `@theme { --font-sans: var(--font-roboto) }` |

→ [fonts 指南](https://docs.astro.build/zh-cn/guides/fonts/)

---

## 17. 导航体验 — View Transitions

商城可选启用客户端导航动画（不阻塞 SEO 页 SSG）：

```astro
---
import { ClientRouter } from "astro:transitions"
---
<head><ClientRouter /></head>
```

列表→详情过渡；**checkout 流程禁用** transition 防状态丢失。

→ [view-transitions](https://docs.astro.build/zh-cn/guides/view-transitions/)

---

## 18. 测试

| 层 | 工具 | 范围 |
|----|------|------|
| Loader/schema | Vitest | mock API → store.set 条数 |
| Astro 组件 | Vitest + `AstroContainer` | 静态组件 |
| Store API | Vitest | `apps/server/tests/store/` ✅ |
| E2E | Playwright | 浏览→加购→checkout→登录 |
| 性能 | Lighthouse CI | LCP/CLS 阈值 |
| 视觉 | 可选 Percy | PDP、列表 |

```typescript
// vitest.config.ts
import { getViteConfig } from "astro/config"
export default getViteConfig({ test: { /* ... */ } })
```

→ [testing 指南](https://docs.astro.build/zh-cn/guides/testing/)

---

## 19. 部署

> **专章**：[adapter-deployment.md](adapter-deployment.md)

| 组件 | 方案 |
|------|------|
| **storefront** | `@astrojs/node` standalone · `pnpm start` |
| **server** | Docker :9000（`apps/server/Dockerfile`） |
| Hybrid | `output: static` + adapter + SSR 页 |
| **禁止** | 仅静态托管 `dist/client` |

| Adapter | 场景 | 图像 |
|---------|------|------|
| **Node（默认）** | Docker / VPS / Railway | Sharp ✅ |
| Vercel | 独立 Vercel 项目 | Sharp ✅ |
| Cloudflare | Workers | passthrough |

→ [adapter-reference](https://docs.astro.build/zh-cn/reference/adapter-reference/) · [node 集成](https://docs.astro.build/zh-cn/guides/integrations-guide/node/)

---

## 20. Webhook 与重建

```
Admin 商品 publish/unpublish
  → POST deploy hook
  → CI: pnpm build --filter=@my-store/storefront
  → 部署 dist（SSG 页更新）
```

变价/库存 **不触发** 全量 rebuild → 用 PDP 注水。

→ [reference.md](reference.md) §Webhook

---

## 21. 错误与空态 UX

| 场景 | 要求 |
|------|------|
| API 失败 | 页面可见错误 + 重试 |
| 空购物车 | 引导回首页 |
| 未登录 account | redirect `/login` |
| 支付失败 | checkout 步内 inline 错误 |
| 404 商品 | SSG 不存在 handle → 404 页 |

---

## 22. 目录结构（目标 storefront）

```
apps/storefront/src/
├── content.config.ts
├── loaders/hono-store-loader.ts
├── actions/index.ts              # 可选
├── middleware.ts
├── stores/cartStore.ts
├── lib/
│   ├── cart.ts                   # apiFetch
│   └── auth.ts
├── components/
│   ├── product/MiniCart.astro       # 原生 script 加购
│   ├── product/ProductCard.astro
│   ├── cart/CartBadge.astro
│   └── checkout/ComplexCheckout.tsx  # 可选 Preact visible
├── layouts/BaseLayout.astro
├── i18n/ui.ts                    # 可选
└── pages/
    ├── index.astro
    ├── products/[handle].astro
    ├── collections/...
    ├── cart.astro                # prerender=false
    ├── checkout.astro
    ├── account.astro
    ├── login.astro
    └── search.astro
```

---

## 23. 模块 × 文档 × MVP 状态

> **实时进度**：[implementation-status.md](implementation-status.md)

| # | 模块 | 专章 | MVP | 目标 |
|---|------|------|-----|------|
| 1 | 数据 Loader | code-templates | ❌ fetch | ✅ |
| 2 | Hybrid/注水 | official-patterns | ❌ static | ✅ |
| 3 | Islands | islands-strategy | ✅ ProductAddToCart | ✅ |
| 4 | Nano Stores | cart-checkout-auth | ✅ | ✅ |
| 5 | 图片 | image-optimization | ✅ Image/Picture | ✅ |
| 6 | 目录 | 本文 §6 | 🟡 fetch | Loader |
| 7 | 购物车 | cart-checkout-auth | ✅ | ✅ |
| 8 | 结算 | cart-checkout-auth | ✅ script | Islands 拆分 |
| 9 | 支付 | 本文 §9 | 手动 | Stripe |
| 10 | 认证 | middleware-security | 🟡 localStorage | cookie + middleware |
| 11 | 订单 | 本文 §11 | ✅ | — |
| 12 | i18n | 本文 §12 | ❌ | ✅ |
| 13 | SEO | seo-and-metadata | 🟡 title only | sitemap+LD |
| 14 | Actions | 本文 §14 | ❌ | 可选 |
| 15 | 安全 | middleware-security | CORS | cookie JWT |
| 16 | 字体 | 本文 §16 | 默认 | Fonts API |
| 17 | View Transitions | 本文 §17 | ❌ | 可选 |
| 18 | 测试 | testing | ❌ | Playwright |
| 19 | 部署 | reference | 分离 | CI |
| 20 | Webhook | reference | ❌ | ✅ |
| — | 工程约定 | storefront-conventions | ✅ | — |
| — | 语义 HTML | native-html-components | ✅ | — |

**迁移顺序**：[migration-checklist.md](migration-checklist.md)

---

## 24. 技术选型一句话

| 领域 | 选型 |
|------|------|
| 框架 | Astro 5 + hybrid |
| UI 交互 | **原生 `<script>` + HTML5**（Preact 仅 checkout） |
| 样式 | Tailwind |
| 状态 | Nano Stores + server cart |
| 数据 | Content Loader ← Hono Store API |
| 认证 | Hono JWT customer（保持） |
| 支付 | Medusa provider → 扩展 Stripe |
| 图片 | astro:assets + domains |
| 测试 | Vitest + Playwright |
| 部署 | storefront 静态/edge + server 独立 |
