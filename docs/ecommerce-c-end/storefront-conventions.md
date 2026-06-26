# Storefront 工程约定

> 路径：`my-medusa-store-hono/apps/storefront`  
> 与 Flutter 主仓库的 `architecture-rules` **独立**；本文件仅约束 Astro C 端。

---

## 1. 目录结构

```
apps/storefront/
├── astro.config.mjs          # output / image / integrations
├── public/                   # favicon、robots.txt（不优化、不存商品图）
├── src/
│   ├── assets/               # 本地图（import → Image 优化）待建
│   ├── components/
│   │   ├── cart/             # 角标、同步 init
│   │   ├── product/          # 卡片图、PDP 图、加购
│   │   └── checkout/         # 未来 Preact 块（仅 checkout）
│   ├── content.config.ts     # 目标态 Content Loader
│   ├── loaders/              # hono-store-loader.ts
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── lib/
│   │   ├── cart.ts           # cart_id、apiFetch
│   │   └── auth.ts           # JWT、login、linkCart
│   ├── middleware.ts         # 目标态路由保护
│   ├── pages/                # 文件路由
│   └── stores/
│       └── cartStore.ts      # nanostores UI 状态
└── .env.example
```

---

## 2. 命名

| 类型 | 规则 | 示例 |
|------|------|------|
| 页面 | Astro 文件路由 | `products/[handle].astro` |
| 商品组件 | `Product*.astro` | `ProductCardImage.astro` |
| 购物车组件 | `Cart*.astro` | `CartBadge.astro` |
| Store | `*Store.ts` | `cartStore.ts` |
| Lib | 领域名 | `cart.ts`, `auth.ts` |
| Loader | `*-loader.ts` | `hono-store-loader.ts` |

**禁止**：

- 加购逻辑写 `.tsx` React/Preact 岛（checkout 除外）
- 页面内新建 `Dio` / 裸 `fetch` 绕过 `lib/cart.ts`（新代码应走 lib）
- 商品图放 `public/`（无法 Sharp 优化）

---

## 3. 网络调用

```
pages/components <script>
       ↓
  lib/cart.ts apiFetch  或  lib/auth.ts
       ↓
  {PUBLIC_API_URL}/api/store/*
```

- `PUBLIC_API_URL` **不含** `/api` 后缀
- 鉴权：`Authorization: Bearer` 来自 `authHeaders()`
- **禁止**：`@medusajs/js-sdk`、直连 DB、Hono RPC

---

## 4. 状态分层

| 数据 | 存储 | 说明 |
|------|------|------|
| server cart | PostgreSQL + `storefront_cart_id` | 权威 |
| 角标数量 | `$cartCount` nanostores | 乐观 UI |
| customer JWT | localStorage | MVP；目标 httpOnly cookie |
| 商品目录 | Content Collection（目标） | build 快照 |

**禁止** Astro Session 与 Medusa cart 双写。

---

## 5. UI 栈优先级

1. 语义 HTML → [native-html-components.md](native-html-components.md)
2. 原生 `<script>` → [islands-strategy.md](islands-strategy.md)
3. HTML5 dialog/details
4. Preact `client:visible` **仅 checkout**

---

## 6. 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `PUBLIC_API_URL` | 是 | 如 `http://localhost:7000` |
| `PUBLIC_SITE_URL` | 否 | canonical / sitemap 绝对 URL |
| `PUBLIC_DEFAULT_LOCALE` | 否 | **兜底**默认语言；正常由 Admin「商店 → 编辑 → 默认语言」 |
| `PUBLIC_DEFAULT_CURRENCY` | 否 | 首次访问默认货币；列表来自 Admin「商店 → 货币」 |
| `PUBLIC_SSG_LOCALES` | 否 | 静态 build 预渲染语言；未设则从 Admin API 读取 |
| `PUBLIC_IMAGE_DOMAINS` | 否 | 逗号分隔 CDN 域名 |
| `ADAPTER` | 否 | `cloudflare` 时启用 passthroughImageService |

**运营向配置步骤**（语言、货币、排错）见 [storefront-configuration.md](storefront-configuration.md)。

---

## 7. 新增页面检查单

- [ ] 渲染模式：SSG 还是 `prerender = false`？
- [ ] 商品图是否 `<Image />` / `<Picture />`？
- [ ] 表单是否 `<fieldset>` / 价是否 `<output>`？
- [ ] 交互是否原生 script + nanostores？
- [ ] SEO：title、description、JSON-LD（若 PDP/列表）
- [ ] 更新 [implementation-status.md](implementation-status.md)

---

## 8. 命令

```powershell
cd D:\webstormProject\my-medusa-store-hono
pnpm dev --filter=@my-store/storefront
pnpm build --filter=@my-store/storefront
pnpm preview --filter=@my-store/storefront
```
