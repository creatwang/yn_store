# MVP → 官方规范 迁移清单



> **进度快照**：[implementation-status.md](implementation-status.md)  

> 基准：`my-medusa-store-hono/apps/storefront`



---



## Phase 0：基础设施 ✅



| `@astrojs/node` standalone + `pnpm start` | ✅ | 见 adapter-deployment.md |

- [x] `image.domains` + Sharp

- [x] `nanostores`

- [x] 无 React

- [x] `@astrojs/sitemap`

- [x] `PUBLIC_SITE_URL`



---



## Phase 1：Content Layer ✅



- [x] `content.config.ts`

- [x] `hono-store-loader.ts` / collections / promotions

- [x] 首页、PDP、集合、促销 → `getCollection`



---



## Phase 2：Hybrid 分界 ✅



- [x] 交易页 + search + `/api/auth/cookie` → `prerender = false`

- [x] 目录页 SSG

- [x] PDP realtime 注水



---



## Phase 3：Islands ✅



- [x] cartStore + ProductAddToCart + CartBadge

- [ ] Preact checkout（可选，未装）



---



## Phase 4：图片 ✅



- [x] ProductCardImage / ProductDetailPicture

- [x] placeholder SVG



---



## Phase 5：SEO ✅



- [x] sitemap + JSON-LD + canonical + robots.txt



---



## Phase 6：Webhook ✅



- [x] `POST /api/webhooks/rebuild-storefront`（server）

- [ ] Admin 自动触发（需配置 `DEPLOY_HOOK_URL`）



---



## Phase 7：增长（部分）



- [x] `/search` SSR

- [x] Playwright E2E 脚手架

- [x] middleware + httpOnly cookie

- [ ] Stripe

- [ ] i18n



---



## Build 前置



```powershell

# server 必须先可达（Loader 同步商品）

pnpm dev --filter=@my-store/server

pnpm build --filter=@my-store/storefront

pnpm preview --filter=@my-store/storefront

```


