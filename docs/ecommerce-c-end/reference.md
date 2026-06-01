# C 端 Store API、Jamstack 接口与运维对照

> 源：`D:\webstormProject\my-medusa-store-hono\apps\server\src\app.ts`  
> API 前缀：`{PUBLIC_API_URL}/api`

---

## Store 路由（已实现）

| 路径 | 用途 | C 端 |
|------|------|------|
| `GET /store/products` | 列表（分页 limit/offset） | Loader bulk、首页 |
| `GET /store/products/:handle` | 详情 | PDP 注水、SSG fallback |
| `/store/carts` | 购物车 | cart、checkout、加购 |
| `/store/orders` | 订单 | account |
| `/store/customers` | 注册/资料 | register |
| `/store/regions` | 区域 | checkout |
| `/store/shipping-options` | 配送 | checkout |
| `/store/payment-collections` | 支付集合 | checkout |
| `/store/payment-providers` | 支付商 | checkout |
| `/store/collections` | 集合 | collections 页 |
| `/store/promotions` | 促销 | promotions、checkout |

### 认证

| 路径 | 说明 |
|------|------|
| `POST /auth/customer/emailpass` | 登录 → `{ token, customer }` |
| `POST /store/customers/register` | 注册 |

Header：`Authorization: Bearer {token}`

---

## Jamstack 友好 API（建议新增）

供 Content Loader、注水、Webhook 使用；在 server 实现时走 `validators → service → route`。

| 接口 | 方法 | 用途 | 状态 |
|------|------|------|------|
| `/store/products` | GET | 分页 bulk（Loader 循环拉取） | ✅ 已有 |
| `/store/products/bulk` | GET | 一次返回 id/handle/title/价/库存（build 加速） | 📋 建议 |
| `/store/products/:handle/realtime` | GET | 仅 `{ price, stock, currency }` | 📋 建议 |
| `/store/collections/bulk` | GET | 集合 + 成员 handle 列表 | 📋 建议 |
| `/webhooks/rebuild-storefront` | POST | Admin 商品变更 → 触发 CI | 📋 建议 |

**bulk 响应形状示例**：

```json
{
  "products": [
    {
      "id": "prod_xxx",
      "handle": "astro-print",
      "title": "Astro 印刷品",
      "thumbnail": "https://...",
      "price": 39.99,
      "stock": 100,
      "status": "published"
    }
  ],
  "count": 1
}
```

---

## Webhook → CI 重建

### 触发时机（Admin / server）

- 商品 publish / unpublish / delete
- 集合成员变更（影响集合 SSG 页）
- 促销上下线（可选）

### 请求

```http
POST https://api.vercel.com/v1/integrations/deploy/...
Content-Type: application/json

{ "reason": "product.updated", "handle": "astro-print" }
```

或 GitHub：

```http
POST /repos/{owner}/{repo}/dispatches
{ "event_type": "rebuild-storefront" }
```

### CI 步骤

```yaml
- run: pnpm install
- run: pnpm build --filter=@my-store/storefront
  env:
    PUBLIC_API_URL: ${{ secrets.STAGING_API_URL }}
- deploy dist/
```

---

## Storefront 页面地图

| 路由 | 渲染目标 | MVP |
|------|----------|-----|
| `/` | SSG | fetch |
| `/products/[handle]` | SSG + 注水 | fetch |
| `/collections/*` | SSG | fetch |
| `/promotions` | SSG | fetch |
| `/search` | SSG/SSR | ❌ |
| `/cart` | SSR | ✅ |
| `/checkout` | SSR | ✅ |
| `/account` | SSR | ✅ |
| `/login`, `/register` | SSR | ✅ |

---

## localStorage 键（MVP）

| 键 | 说明 |
|----|------|
| `storefront_cart_id` | Server cart ID |
| `storefront_customer_token` | JWT |
| `storefront_customer` | 客户 JSON 缓存 |

迁移后：`$cartId` atom 与 `storefront_cart_id` 保持同步。

---

## 环境变量

| 应用 | 变量 |
|------|------|
| storefront | `PUBLIC_API_URL`（不含 `/api`） |
| server | `STORE_CORS_ORIGIN`, `DATABASE_URL`, `JWT_SECRET` |
| CI build | `PUBLIC_API_URL` = staging 可读 API |
| Webhook | `DEPLOY_HOOK_URL`, `WEBHOOK_SECRET` |

---

## 端口

| 服务 | 端口 |
|------|------|
| server | 9000 |
| admin dev | 5173 |
| storefront | 4321 |

---

## 命令

```powershell
cd D:\webstormProject\my-medusa-store-hono
pnpm dev
pnpm dev --filter=@my-store/storefront
pnpm build --filter=@my-store/storefront
pnpm preview --filter=@my-store/storefront
pnpm start --filter=@my-store/storefront   # 产线 Node adapter
```

---

## 已知缺口汇总

> **完整进度表**：[implementation-status.md](implementation-status.md)

| 能力 | 现状 |
|------|------|
| Content Loader + Hybrid | ✅ |
| `@astrojs/node` + `pnpm start` | ✅ [adapter-deployment.md](adapter-deployment.md) |
| Nano Stores + 加购 | ✅ |
| Image / SEO / middleware | ✅ |
| Playwright E2E | ✅ 脚手架 |
| Stripe / i18n | ❌ 可选 |

---

## Storefront 生产（Node adapter）

```powershell
cd apps/storefront
pnpm build
pnpm start   # node ./dist/server/entry.mjs
```

→ 完整说明：[adapter-deployment.md](adapter-deployment.md)

---

## 延伸阅读（Astro 官方）

- **图像（必读）**：`https://docs.astro.build/zh-cn/guides/images/`
- 图像服务 API：`https://docs.astro.build/zh-cn/reference/image-service-reference/`
- 完整索引：[astro-docs-index.md](astro-docs-index.md)
- Content Loader：`https://docs.astro.build/zh-cn/reference/content-loader-reference/`
- 电商指南：`https://docs.astro.build/zh-cn/guides/ecommerce/`
- 认证：`https://docs.astro.build/zh-cn/guides/authentication/`
- 测试：`https://docs.astro.build/zh-cn/guides/testing/`
- Image：`https://docs.astro.build/zh-cn/reference/image-service-reference/`
- 部署：Cloudflare / Vercel / Node integrations
