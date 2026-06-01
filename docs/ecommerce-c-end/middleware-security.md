# 中间件与安全

> 目标：SSR 路由保护、会话硬化、CORS 对齐  
> 现状：**未实现** `src/middleware.ts`（MVP 靠客户端 script + localStorage）

---

## 1. 原则

| 项 | 做法 |
|----|------|
| 交易权威 | Hono Store API + DB |
| 前端会话 | MVP localStorage JWT → 目标 **httpOnly cookie** |
| 路由保护 | `astro:middleware` redirect |
| 购物车 | 不 middleware 拦截；cart_id 可匿名 |

**不用** Astro Sessions 存 cart（与 Medusa cart 冲突）。

---

## 2. middleware 模板（目标态）

```typescript
// src/middleware.ts
import { defineMiddleware } from "astro:middleware"

const PROTECTED = ["/account", "/checkout"]

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url
  const needsAuth = PROTECTED.some((p) => pathname.startsWith(p))

  if (!needsAuth) return next()

  const token = context.cookies.get("customer_token")?.value
  if (!token) {
    return context.redirect(`/login?redirect=${encodeURIComponent(pathname)}`)
  }

  // 可选：校验 JWT 或调 GET /store/customers/me
  context.locals.customerToken = token
  return next()
})
```

**前提**：登录成功时 server 或 Astro endpoint Set-Cookie httpOnly。

---

## 3. JWT 迁移路径

| 阶段 | 存储 | middleware |
|------|------|------------|
| MVP（当前） | localStorage | ❌ 客户端跳转 |
| 目标 | httpOnly Secure cookie | ✅ middleware |
| 可选 | Refresh token rotation | Hono 实现 |

登录页改造：

1. `POST /api/auth/customer/emailpass` 不变
2. 新增 Astro API route `POST /api/session` Set-Cookie
3. 逐步弃用 localStorage token（双写过渡期）

---

## 4. CSRF / CORS

- Storefront fetch 同源或 `PUBLIC_API_URL` 已 CORS
- Server：`STORE_CORS_ORIGIN` 含 `http://localhost:4321` 与生产域
- Cookie 会话时：SameSite=Lax；跨域需显式配置

---

## 5. 敏感页 robots

cart / checkout / account：

```html
<meta name="robots" content="noindex, nofollow" />
```

见 [seo-and-metadata.md](seo-and-metadata.md)。

---

## 6. Webhook 安全

Admin → rebuild hook：

```http
POST /webhooks/rebuild-storefront
X-Webhook-Secret: ${WEBHOOK_SECRET}
```

CI 校验 secret；勿在 storefront 暴露。

---

## 7. 环境变量

| 变量 | 用途 |
|------|------|
| `JWT_SECRET` | server 签发 |
| `STORE_CORS_ORIGIN` | CORS |
| `WEBHOOK_SECRET` | rebuild 校验 |

---

## 8. 验收

- [ ] 未登录访问 `/account` → 302 `/login`
- [ ] 未登录可访问 `/cart`、加购
- [ ] Token 不在 JS 可读 cookie（httpOnly）
- [ ] checkout 完成 clearCartId

→ 进度：[implementation-status.md](implementation-status.md) §7
