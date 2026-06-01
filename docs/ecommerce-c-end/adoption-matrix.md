# 现有商城 × Astro 官方适配矩阵

> 项目：`my-medusa-store-hono/apps/storefront`  
> 目标：**高性能（LCP/CLS）· 高评分（Lighthouse/SEO）· 高转化（加购→结算）**

---

## 1. 现有 C 端功能清单

| 功能 | 路由 | 后端 API | 现状实现 |
|------|------|----------|----------|
| 商品列表 | `/` | `GET /store/products` | fetch + **ProductCardImage** |
| 商品详情 | `/products/[handle]` | `GET /store/products/:handle` | fetch + **Picture** + **ProductAddToCart**（output/fieldset） |
| 商品集合 | `/collections`, `/collections/[handle]` | `GET /store/collections` | fetch + **ProductCardImage** |
| 促销 | `/promotions` | `GET /store/promotions` | fetch |
| 购物车 | `/cart` | `GET /store/carts/:id` | localStorage + 内联 script |
| 结算 | `/checkout` | carts/shipping/payment/complete | 多步内联 script |
| 登录 | `/login` | `POST /auth/customer/emailpass` | 表单 + auth.ts |
| 注册 | `/register` | `POST /store/customers/register` | 同上 |
| 账户/订单 | `/account` | `GET /store/orders` | Bearer + script |
| Header 角标 | 全站 | cart count | **CartBadge** + **CartCountInit** + nanostores |
| 搜索 | — | — | ❌ 无 |
| i18n | — | — | ❌ 硬编码中文 |

> 详细进度：[implementation-status.md](implementation-status.md)

---

## 2. 适配评级说明

| 评级 | 含义 |
|------|------|
| **🟢 直接适配** | Astro 官方一等能力，替换 MVP 实现，几乎不改 Hono |
| **🟡 增强适配** | 官方能力 + 少量 Hono/storefront 改造 |
| **🔵 保持自建** | 继续用 Hono/Medusa，Astro 只做壳；勿换官方 auth/cart 栈 |
| **⚪ 暂不优先** | 对评分/转化边际低或复杂度高 |

---

## 3. 功能 × Astro 官方 × 集成方向

### A. 性能 & 评分（Lighthouse / Core Web Vitals）

| 现有功能 | Astro 官方能力 | 评级 | 集成方向 | 预期收益 |
|----------|----------------|------|----------|----------|
| 商品列表/详情图 | `astro:assets` `<Image />` `<Picture />` | 🟢 | `image.domains` + 卡片/PDP 组件 | **LCP ↓ CLS ↓** 评分 +15~25 |
| 列表/详情页 | `output: 'hybrid'` + SSG | 🟢 | 目录 SSG，交易 SSR | **TTFB/LCP ↓** SEO 爬取稳定 |
| 详情价/库存 | 静态 HTML + `is:inline` 注水 | 🟢 | SSG 骨架 + runtime fetch Store API | SEO 有价 + 实时准确 |
| 全局字体 | Fonts API `fontProviders` | 🟡 | 自托管 1 款 sans，preload 仅标题 | **CLS ↓** 隐私合规 |
| SSR 购物车/账户 | Streaming 子组件 | 🟡 | 拆 CartLineItems 并行 await | **INP/TTFB 改善** |
| 部署 | `@astrojs/vercel` / `node` | 🟢 | Sharp 图像 + edge 可选 | 生产环境图像优化 |

**最高 ROI 组合**：Hybrid SSG 目录 + Image/Picture + 远程 domains（Phase 1，见 §5）

---

### B. SEO & 可发现性

| 现有功能 | Astro 官方能力 | 评级 | 集成方向 |
|----------|----------------|------|----------|
| 全站 title | Layout props | 🟢 | 每页 `description` + canonical |
| 商品/集合 URL | `getStaticPaths` + Content Loader | 🟢 | Loader 驱动 sitemap 条目 |
| Sitemap | `@astrojs/sitemap` | 🟢 | build 自动生成 `/products/*` |
| PDP 结构化数据 | SSG frontmatter | 🟡 | JSON-LD `Product` 模板 |
| OG 分享图 | `getImage()` | 🟡 | 1200×630 WebP |
| i18n URL | [i18n recipe](https://docs.astro.build/zh-cn/recipes/i18n/) | 🟡 | `/zh-cn/` `/en/` 后期 |

**最高 ROI**：sitemap + PDP meta/JSON-LD + SSG 详情（Phase 1~2）

---

### C. 转化（加购 → 结算 → 支付）

| 现有功能 | Astro 官方能力 | 评级 | 集成方向 | 转化要点 |
|----------|----------------|------|----------|----------|
| 加购按钮 | **原生 `<script>` + Nano Stores** | 🟢 | `MiniCart.astro`，0 框架运行时 | **即时反馈**，LCP 不降 |
| 购物车抽屉 | `<dialog>` 或 script + nanostores | 🟢 | 优先 HTML5 dialog | 减少跳转 |
| 购物车页 | SSR `prerender=false` | 🟢 | 保持 SSR，流式加载 line-items | 首屏快 |
| 结算多步 | SSR + 原生 `<script>` | 🟢 | 保持/拆分 checkout.astro | 与 MVP 一致 |
| 极复杂 checkout | Preact `client:visible` | 🟡 | 仅必要时 `astro add preact` | 禁止 React |
| 支付 | Stripe.js 原生 import 或 Preact `client:only` | 🟡 | 非 checkout 页不加载 Preact | 在线支付 |
| 促销码 | 保持 Hono checkout | 🔵 | 现有 checkout 逻辑 | 已可用 |
| 登录合并购物车 | 保持 `linkCartToCustomer` | 🔵 | auth.ts 不变 | 已可用 |
| Snipcart/Lemon/Paddle | 官方 overlay 文档 | ⚪ | **不推荐**替换 Medusa cart | 与现有栈冲突 |

**最高 ROI**：Nano Stores 加购 + Header 角标 + 购物车抽屉（Phase 2）

---

### D. 认证 & 账户

| 现有功能 | Astro 官方能力 | 评级 | 集成方向 |
|----------|----------------|------|----------|
| 邮箱密码登录 | Better Auth / Clerk 文档 | 🔵 | **保持 Hono JWT** |
| 路由保护 | `astro:middleware` | 🟢 | `/account` `/checkout` cookie 校验 redirect |
| 会话存储 | Astro Sessions | ⚪ | **不用**（与 Medusa cart 重复） |
| SSR 账户页 | `prerender=false` + `Astro.locals` | 🟡 | middleware 注入 customer 摘要 |

**推荐**：Hono 认证不动 + Astro middleware 保护 SSR 路由（Phase 2）

---

### E. 数据层

| 现有功能 | Astro 官方能力 | 评级 | 集成方向 |
|----------|----------------|------|----------|
| 商品/集合 fetch | Content Loader API | 🟢 | `hono-store-loader.ts` 替代页面 fetch |
| 类型安全 | Zod schema in `content.config.ts` | 🟢 | 与 `@my-store/validators` 字段对齐 |
| 上下架 | Webhook → CI rebuild | 🟡 | Admin 触发 deploy hook |
| Actions 加购 | `astro:actions` | 🟡 | 可选替代部分 client fetch（需 adapter） |

**推荐**：Content Loader 为官方最契合点（Phase 1）

---

### F. 体验增强（第二阶段）

| 能力 | Astro 官方 | 评级 | 说明 |
|------|------------|------|------|
| 页间导航 | View Transitions | 🟡 | 列表→详情平滑；checkout 禁用 |
| 个性化块 | Server Islands | 🟡 | 「为你推荐」SSR defer |
| 搜索页 | SSG + Loader 索引 | 🟡 | 需 Hono `?q=` API |
| DAM 图床 | Cloudinary 集成 | 🟡 | 图多/需裁剪时 |
| 测试 | Vitest + Playwright | 🟢 | 转化漏斗 E2E |

---

## 4. 不建议用 Astro 官方替换的部分

| 能力 | 原因 |
|------|------|
| Medusa Store REST / cart 表 | 已是权威交易数据 |
| Hono JWT customer | 与 DB 一致，换 Clerk/Better Auth 双栈 |
| Astro Sessions 存购物车 | 与 server cart_id 冲突 |
| Snipcart 全托管购物车 | 放弃 Medusa 订单链路 |
| `@medusajs/js-sdk` | 项目规范禁止；fetch 或 Loader 即可 |

---

## 5. 三阶段集成路线（高性能 · 高评分 · 高转化）

### Phase 1 — 评分与 SEO（1~2 周，改 storefront 为主）

**目标**：Mobile Lighthouse Performance ≥ 90，SEO 可爬全量 SKU

| 序号 | 动作 | Astro 官方项 |
|------|------|--------------|
| 1 | `output: 'hybrid'` + 目录 SSG | routing-reference |
| 2 | Content Loader 商品/集合 | content-loader-reference |
| 3 | `<Picture />` PDP + `<Image />` 列表 | guides/images |
| 4 | `image.domains` Medusa CDN | guides/images |
| 5 | `@astrojs/sitemap` | integrations-guide/sitemap |
| 6 | Layout：description、canonical、Product JSON-LD | — |
| 7 | PDP 价/库存注水 | hybrid 静态-动态 |

**不动**：checkout/cart/auth 业务逻辑

---

### Phase 2 — 转化（1~2 周）

**目标**：加购点击率↑、结算完成率↑

| 序号 | 动作 | Astro 官方项 |
|------|------|--------------|
| 1 | Nano Stores + `MiniCart.astro` + `CartBadge.astro` | sharing-state-islands |
| 2 | 可选 `<dialog>` 购物车预览 | HTML5 |
| 3 | `middleware.ts` 保护 account/checkout | guides/middleware |
| 4 | JWT → httpOnly cookie | middleware |
| 5 | 仅 checkout 需要时 `npx astro add preact` | integrations-guide/preact |
| 6 | 流式 SSR 购物车组件 | streaming recipe |

---

### Phase 3 — 增长（按需）

| 序号 | 动作 |
|------|------|
| 1 | Stripe ↔ Hono payment provider |
| 2 | i18n recipe（跨境） |
| 3 | 搜索 API + `/search` SSG |
| 4 | View Transitions（非 checkout） |
| 5 | Playwright 转化漏斗 CI |
| 6 | Admin Webhook → rebuild |

---

## 6. 一句话「最合适方向」

```
保留 Hono/Medusa 做「交易大脑」
    +
Astro 官方做「高性能展示与转化壳」：
  Content Loader（数据）
  + Hybrid SSG 目录（SEO/LCP）
  + Image/Picture（CWV 评分）
  + Islands + Nano Stores（原生 script 加购转化）
  + middleware（账户/结算保护）
  + sitemap/JSON-LD（搜索流量）
  + 后期 Stripe island（支付闭环）
```

这是 **官方文档与 my-medusa-store-hono 冲突最小、评分/转化 ROI 最大** 的路径。

---

## 7. 转化漏斗 × 技术映射

```
流量（SEO/sitemap/SSG PDP）
  ↓ LCP < 1.5s（Picture + hybrid）
浏览列表（零 JS 卡片 Image）
  ↓
详情（SSG + 注水价 + MiniCart.astro 加购）
  ↓ 原生 script + nanostores 角标
购物车（SSR 流式）
  ↓ middleware 可选登录
结算（SSR + Stripe client:only）
  ↓
完成（clearCartId + 订单 SSR account）
```

---

## 8. 快速决策表

| 你的目标 | 优先集成的 Astro 官方项 |
|----------|-------------------------|
| Lighthouse 分数 | Image/Picture + hybrid SSG + Fonts preload |
| Google 收录 | Content Loader + sitemap + JSON-LD |
| 加购率 | 原生 `<script>` MiniCart + nanostores |
| 结算率 | SSR checkout + middleware + Stripe |
| 跨境 | i18n recipe + region API（已有） |
| 运维 | Webhook rebuild + Vercel/Node adapter |
