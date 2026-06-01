# Astro 官方 C 端商城最佳实践（对齐文档）

> 参考：Astro Content Loader API、Islands、Hybrid、Image Service  
> 中文文档：`https://docs.astro.build/zh-cn/reference/content-loader-reference/`  
> 项目落地：数据来自 Hono `/api/store/*`，非泛化 `yourbackend.com`

---

## §1 数据层：Content Layer + Loader

### 1.1 为什么不用页面内 fetch

| 页面 fetch | Content Loader |
|------------|----------------|
| 无编译期类型校验 | Zod schema 编译报错 |
| 逻辑重复 N 页 | 单一数据管线 |
| 难做增量 rebuild | 配合 Webhook 统一 build |
| SEO 与类型漂移 | `getCollection` 统一入口 |

### 1.2 文件位置（Astro 5+）

```
apps/storefront/src/
├── content.config.ts      # defineCollection + loader + schema
├── loaders/
│   └── hono-store-loader.ts
└── pages/
    └── products/[handle].astro   # getStaticPaths from collection
```

旧路径 `src/content/config.ts` **已废弃**，用 `content.config.ts`。

### 1.3 Loader 契约

Loader 是实现 `load({ store, logger, meta })` 的**对象**，或返回条目的 async 函数。

Build-time 流程：

1. `logger.info` 开始同步
2. `fetch` Hono Store API（分页直至取完 published 商品）
3. 每条 `store.set({ id, data })` — `id` 建议用 `handle`（URL 友好）
4. Zod schema 校验失败 → build 失败（防白屏）

### 1.4 与 Hono Store 字段映射

| Medusa / Hono 字段 | Collection `data` |
|--------------------|-------------------|
| `id` | `id` |
| `handle` | 作为 entry `id` 或 `slug` |
| `title`, `subtitle`, `description` | 同名 |
| `thumbnail` | `coverImage` |
| `images[]` | `images` |
| `variants[].price.amount` | `price`（默认 variant） |
| `variants[].inventory_quantity` | `stock` |
| `collection_id` / tags | `category` / `attributes` |

仅同步 **`status = published`**（server 已过滤则 Loader 二次断言）。

### 1.5 实时数据 vs Build-time 数据

| 数据 | 来源 | 时机 |
|------|------|------|
| 标题、描述、图集、handle | Loader / SSG | build |
| 价格、库存、促销价 | Store API 注水 | runtime |
| 购物车、订单 | Store API | runtime SSR |

---

## §2 Hybrid 渲染 + 静态-动态注水

### 2.1 astro.config.mjs

```javascript
import { defineConfig } from "astro/config"
import tailwind from "@astrojs/tailwind"
// Preact 仅 checkout 需要时再：npx astro add preact
// 禁止 @astrojs/react

export default defineConfig({
  output: "hybrid",
  integrations: [tailwind()],
  server: { port: 4321 },
  image: {
    // 远程 Medusa thumbnail 域名加入 allowlist
    domains: ["your-cdn.example.com"],
  },
})
```

### 2.2 页面 prerender 规则

**SSG（默认 prerender true）**

- `index.astro`
- `products/[handle].astro` — 必须 `getStaticPaths`
- `collections/index.astro`、`collections/[handle].astro`
- `promotions.astro`

**SSR（显式关闭）**

```astro
---
export const prerender = false
---
```

- `cart.astro`、`checkout.astro`
- `account.astro`、`login.astro`、`register.astro`

### 2.3 PDP 注水模式

1. SSG 输出：`h1`、描述、`<Image />`、静态 fallback 价
2. `#js-live-price`、`#js-live-stock` 占位
3. `script is:inline define:vars={{ handle, basePrice }}`：
   - 先展示 `basePrice`（SEO + 首屏）
   - `fetch(\`${PUBLIC_API_URL}/api/store/products/${handle}\`)` 刷新 variant 价/库存
4. 失败时保留静态价，不白屏

可选：server 提供轻量 `GET /store/products/:handle/realtime` 只返回 `{ price, stock }`。

### 2.4 上下架 → 重建

运营在 Admin 保存/下架商品 → Hono Admin API → **Webhook POST** 到 CI（Vercel Deploy Hook / GitHub `repository_dispatch` / Jenkins）→ `pnpm build --filter=@my-store/storefront` → 增量或全量 deploy。

---

## §3 UI 岛技术栈（原生优先）

> **完整规范**：[islands-strategy.md](islands-strategy.md)

### 3.1 选用优先级

| 优先级 | 方案 | 适用 |
|--------|------|------|
| 🥇 | Astro 原生 `<script>` + HTML | 加购、角标、Tab、筛选、cart/checkout 大部分逻辑 |
| 🥈 | HTML5 `<dialog>` / `<details>` | 弹窗、FAQ、参数折叠（零 JS） |
| 🥉 | Preact `client:visible` | **仅** checkout 极复杂受控块 |
| 🚫 | React 岛 | **禁止** |

### 3.2 client 指令（仅 Preact/支付 SDK）

| 指令 | 适用 |
|------|------|
| （无） | 默认：所有 `.astro` + 内嵌 `<script>` |
| `client:visible` | Preact 组件唯一默认指令 |
| `client:only="preact"` | Stripe 等必须浏览器 API 的支付 widget |

### 3.3 反模式

- ❌ 加购/角标写 `.tsx` React/Preact 岛
- ❌ `Layout` 包 `client:load` 根组件
- ❌ `astro add react`
- ❌ Preact 在非 checkout 页 `client:load`

### 3.4 目录建议

```
src/components/
├── product/
│   ├── ProductCardImage.astro
│   ├── ProductDetailPicture.astro
│   ├── ProductAddToCart.astro      # 原生 script + output 价（首选）
│   └── ProductSpecs.astro          # <details> 零 JS
├── cart/
│   ├── CartBadge.astro
│   └── CartCountInit.astro
└── checkout/
    └── ComplexCheckout.tsx         # 可选 Preact，client:visible only
```

---

## §4 Nano Stores（MPA 全局状态）

### 4.1 原则

Astro 是 MPA；跨页面/跨 Islands 的**瞬时 UI 状态**用 Nano Stores，**持久 cart** 仍用 server cart_id + localStorage。

### 4.2 推荐 stores

| Store | 用途 |
|-------|------|
| `$cartCount` | Header 角标 |
| `$cartId` | 与 localStorage 同步的 server cart |
| `$customer` | 登录态摘要（详细仍调 API） |

### 4.3 加购时序

1. `incrementCart()` 乐观 UI
2. `POST /api/store/carts/:id/line-items`
3. 失败 → `decrementCart()` + toast/inline 错误

### 4.4 依赖

```bash
pnpm add nanostores --filter=@my-store/storefront
# checkout 用 Preact 时再加：@nanostores/preact
# 禁止 @nanostores/react
```

---

## §5 图片优化 + Core Web Vitals

> **完整专章**（含 astro.config、Picture、远程 Medusa 图、Cloudflare、检查清单）：  
> [image-optimization.md](image-optimization.md)

### 5.1 指标目标

| 指标 | 目标 | 手段 |
|------|------|------|
| LCP | < 1.5s | SSG + PDP `<Picture loading="eager" fetchpriority="high" />` |
| CLS | < 0.1 | `<Image width height layout="constrained" />` |
| INP | 良好 | Islands 按需 |

### 5.2 官方要点摘要

- 商品图：`src/` 或 **授权远程 URL** → `<Image />` / `<Picture />`
- `public/` 不优化，**不存商品图**
- 未授权远程域 → 不优化，可能报错 `remote-image-not-allowed`
- Astro 5.10+：`layout: 'constrained'` 全局响应式 + 自动 srcset
- SSR 页走 `/_image` 端点；SSG 预生成 `/_astro/*.webp`

### 5.3 SEO 补充

- 每页 `title`、`description`；`@astrojs/sitemap`
- PDP `Product` JSON-LD；OG 图用 `getImage()`

---

## §6 测试（官方推荐栈）

| 层级 | 工具 | 范围 |
|------|------|------|
| Loader 单元 | Vitest | mock fetch → store.set 条数、schema |
| Astro 组件 | Vitest + `experimental_AstroContainer` | 静态组件渲染 |
| E2E | Playwright | 加购、checkout、LCP 采样 |
| 视觉回归 | 可选 Percy / lost-pixel | PDP、列表 |

Storefront 当前无测试 → 优先 Playwright 覆盖 happy path。  
→ 完整策略：[testing.md](testing.md)
