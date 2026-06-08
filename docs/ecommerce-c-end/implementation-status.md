# 实现状态总览（单一事实来源）

> 仓库：`D:\webstormProject\my-medusa-store-hono/apps/storefront`  
> **改代码后请同步更新本文件**

最后核对：2026-05-30（P2 项见 [REMAINING-WORK.md](../REMAINING-WORK.md)）

---

## 图例

| 符号 | 含义 |
|------|------|
| ✅ | 已落地且 build 通过 |
| 🟡 | 部分完成 |
| ❌ | 未开始 |

---

## 1. 基础设施

| 项 | 状态 | 说明 |
|----|------|------|
| Astro 5 + Tailwind | ✅ | |
| Hybrid（static + SSR） | ✅ | `@astrojs/node` standalone |
| `image` + Sharp | ✅ | |
| `@astrojs/sitemap` | ✅ | `sitemap-index.xml` |
| `nanostores` | ✅ | |
| 无 React | ✅ | |
| `PUBLIC_SITE_URL` | ✅ | canonical / sitemap |

---

## 2. 数据层

| 项 | 状态 | 说明 |
|----|------|------|
| `content.config.ts` | ✅ | products / collections / promotions |
| `hono-store-loader.ts` | ✅ | 含 variants 详情 |
| `hono-collections-loader.ts` | ✅ | 含合集内商品 |
| `hono-promotions-loader.ts` | ✅ | |
| 首页 `getCollection` | ✅ | |
| PDP Content Entry | ✅ | |
| Webhook rebuild | ✅ | `POST /api/webhooks/rebuild-storefront` |

---

## 3. 渲染分界

| 路由 | 目标 | 现状 |
|------|------|------|
| `/`, `/products/*`, `/collections/*`, `/promotions` | SSG | ✅ |
| `/search` | SSR | ✅ `prerender = false` |
| `/cart`, `/checkout`, `/account`, `/login`, `/register` | SSR | ✅ |
| PDP 价/库存注水 | ✅ | `/realtime` + `<meter>` |

---

## 4. UI / 交互

| 项 | 状态 |
|----|------|
| ProductAddToCart + output/fieldset | ✅ |
| CartBadge + CartCountInit | ✅ |
| ProductCard / ProductCardImage | ✅ |
| ProductDetailPicture + placeholder | ✅ |
| `<dialog>` 预览 | ❌ 可选 |

---

## 5. 图片

| 项 | 状态 |
|----|------|
| 列表 Image | ✅ |
| PDP Picture avif/webp | ✅ |
| placeholder SVG | ✅ |
| OG getImage | ✅ PDP |

---

## 6. SEO

| 项 | 状态 |
|----|------|
| title + description + canonical | ✅ BaseLayout |
| noindex 交易页 | ✅ middleware |
| JSON-LD Product | ✅ |
| sitemap | ✅ |
| robots.txt | ✅ |

---

## 7. 交易 / 认证

| 项 | 状态 |
|----|------|
| cart/checkout 流程 | ✅ |
| middleware 保护 account/checkout | ✅ |
| httpOnly cookie API | ✅ `/api/auth/cookie` |
| login 写 cookie | ✅ |
| `GET /store/products/:handle/realtime` | ✅ server |

---

## 8. 测试

| 项 | 状态 |
|----|------|
| Playwright e2e | ✅ `e2e/storefront.spec.ts` |
| Vitest Loader | ❌ 可选 |

---

## 9. 部署 / CI

| 项 | 状态 | 说明 |
|----|------|------|
| `@astrojs/node` standalone | ✅ | 默认 `ASTRO_DEPLOY_TARGET=node` |
| `@astrojs/vercel` | ✅ | `vercel.json` + `pickAdapter()` |
| Dockerfile | ✅ | `apps/storefront/Dockerfile` |
| GitHub Actions | ✅ | `.github/workflows/storefront.yml` |
| Cloudflare adapter | ❌ | 需 `@astrojs/cloudflare` |

---

## 10. 仍可选（Phase 增长）

| 能力 | 状态 |
|------|------|
| Stripe 支付 | ❌ 需 payment provider 配置 |
| i18n 多语言 | ❌ |
| Preact checkout | ❌ 当前 script 够用 |
| `<dialog>` 购物车抽屉 | ❌ |

---

## 11. 组件清单

```
src/
├── assets/product-placeholder.svg
├── components/
│   ├── cart/CartBadge.astro, CartCountInit.astro
│   ├── product/ProductAddToCart, ProductCard, ProductCardImage, ProductDetailPicture
│   └── seo/ProductJsonLd.astro
├── content.config.ts
├── loaders/hono-*-loader.ts
├── lib/store-api.ts, cart.ts, auth.ts
├── middleware.ts
├── pages/api/auth/cookie.ts
└── pages/search.astro
```
