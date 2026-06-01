# Astro 适配器与部署方案

> 官方：[adapter-reference](https://docs.astro.build/zh-cn/reference/adapter-reference/) · [按需渲染](https://docs.astro.build/zh-cn/guides/on-demand-rendering/) · [Node 集成](https://docs.astro.build/zh-cn/guides/integrations-guide/node/)  
> 项目：`my-medusa-store-hono/apps/storefront`

---

## 1. 结论：**必须落实 adapter**

| 条件 | 本项目 |
|------|--------|
| 存在 `export const prerender = false` 页面 | ✅ cart / checkout / account / login / register / search |
| 存在 `src/middleware.ts` | ✅ 保护 account/checkout |
| 存在 SSR API 路由 | ✅ `/api/auth/cookie` |
| 需要运行时 cookie / redirect | ✅ httpOnly JWT |

**没有 adapter** → 构建报错 `no-adapter-installed` 或 SSR 页无法在产线运行。  
**禁止** 将当前 storefront 仅部署到纯静态桶（S3/静态 Pages）而忽略 SSR 路由。

---

## 2. 架构：双进程（与 Hono 分离）

```
浏览器
  ├─ :4321  Astro storefront（adapter 提供 SSR + 静态 dist/client）
  └─ :9000  Hono server（/api/store/* 交易大脑）
```

- Storefront adapter **只负责 Astro 页面**，不替代 Hono API。
- `PUBLIC_API_URL` 指向 Hono，非 Astro 自身。

---

## 3. 当前选型（已落地）

| 项 | 值 |
|----|-----|
| 包 | `@astrojs/node@9`（兼容 Astro 5） |
| 模式 | **`standalone`** — 独立 Node 进程，`node dist/server/entry.mjs` |
| `output` | **`static`** + 部分 SSR 页 = **Hybrid**（Astro 5 官方写法） |
| 配置 | `astro.config.mjs` → `pickAdapter()` |

### 3.1 standalone vs middleware

| 模式 | 适用 | 本项目 |
|------|------|--------|
| **standalone** | Docker / VPS / Railway / Render 单独跑 storefront | **✅ 默认** |
| **middleware** | Express/Fastify/Hono **同进程** 挂载 Astro 处理前端 | 可选，非默认 |

若未来要把 storefront 挂到 Hono 同一端口，再评估 `node({ mode: 'middleware' })` + 自定义 server 入口。**当前保持独立进程更简单。**

---

## 4. 环境变量

| 变量 | 说明 |
|------|------|
| `ASTRO_DEPLOY_TARGET` | `node`（默认）\| `vercel` \| `cloudflare` |
| `PUBLIC_SITE_URL` | canonical / sitemap 生产域 |
| `HOST` / `PORT` | Node standalone 监听（默认 4321） |
| `PUBLIC_API_URL` | Hono Store API 根地址 |

---

## 5. 部署矩阵

| 目标 | Adapter | 安装 | 图像 | 命令 |
|------|---------|------|------|------|
| **Docker / VPS / Railway** | `@astrojs/node` standalone | ✅ 已装 | Sharp | `pnpm build && pnpm start` |
| **Vercel** | `@astrojs/vercel` | ✅ 已装 | Sharp（Serverless） | `vercel.json` + Git 集成 |
| **Cloudflare Workers** | `@astrojs/cloudflare` | `pnpm add @astrojs/cloudflare` | `passthroughImageService()` | Wrangler |
| 纯静态 CDN | — | ❌ **不可用** | — | 缺 SSR |

切换 Vercel：`ASTRO_DEPLOY_TARGET=vercel`（`vercel.json` 已设）。Cloudflare 仍需 `pnpm add @astrojs/cloudflare`。

---

## 6. Vercel 部署

1. Vercel 项目 **Root Directory** → `apps/storefront`
2. 环境变量：
   - `PUBLIC_API_URL` — 生产 Hono API
   - `PUBLIC_SITE_URL` — 商城域名
   - `ASTRO_DEPLOY_TARGET=vercel`（`vercel.json` 默认已设）
3. Build 时 Loader 需能访问 `PUBLIC_API_URL`（staging 或产线 API）
4. Server webhook：`DEPLOY_HOOK_URL` → `POST /api/webhooks/rebuild-storefront`

`apps/storefront/vercel.json` 从 monorepo 根执行 `pnpm build --filter=@my-store/storefront`。

---

## 7. Docker（Node standalone）

`apps/storefront/Dockerfile` — 多阶段 build + `node dist/server/entry.mjs`。

```bash
docker build -f apps/storefront/Dockerfile \
  --build-arg PUBLIC_API_URL=https://api.example.com \
  --build-arg PUBLIC_SITE_URL=https://shop.example.com \
  -t my-store-storefront .
docker run -p 4321:4321 -e PUBLIC_API_URL=https://api.example.com my-store-storefront
```

Build 阶段需 Store API 可达（Content Loader）。`host.docker.internal:9000` 可用于本机 API。

---

## 8. GitHub Actions

`.github/workflows/storefront.yml`：

| Secret | 用途 |
|--------|------|
| `STAGING_API_URL` | 优先：Loader 拉 staging 商品 |
| `STAGING_SITE_URL` | canonical 域（可选） |
| `DATABASE_URL` | 无 staging 时 CI 起本地 server |
| `JWT_SECRET` | 本地 server 鉴权 |

无上述 secret 时 build 跳过并 warning（fork PR 友好）。有 build 则跑 Playwright E2E（`pnpm preview`）。

---

## 9. 生产命令（Node）

```powershell
cd apps/storefront
$env:PUBLIC_API_URL="https://api.example.com"
$env:PUBLIC_SITE_URL="https://shop.example.com"
pnpm build
$env:HOST="0.0.0.0"
$env:PORT="4321"
pnpm start
```

Build 产物：

```
dist/
├── client/          # SSG 静态资源（HTML/CSS/JS/_astro）
└── server/
    └── entry.mjs    # SSR 入口
```

**预览**：`pnpm preview`（等同产线 Node 服务，非静态文件服务器）。

---

## 10. CI / Webhook 重建

1. Admin 商品变更 → `POST /api/webhooks/rebuild-storefront`
2. CI：`.github/workflows/storefront.yml`（见 §8）
3. 部署 **整个 dist/**（含 `server/`），或 Docker 镜像 `pnpm start`

勿只上传 `dist/client` — SSR 路由会 404。

---

## 11. Adapter API 文档 vs 本项目

[adapter-reference](https://docs.astro.build/zh-cn/reference/adapter-reference/) 描述 **如何编写自定义 adapter**（`setAdapter`、`serverEntrypoint`、`supportedAstroFeatures`）。

| 内容 | 是否需要 |
|------|----------|
| 自研 adapter | ❌ 不需要 |
| 官方 `@astrojs/node` | ✅ 已用 |
| `edgeMiddleware` / 自定义 `exports` | ❌ 平台集成才需要 |
| `sharpImageService` 能力声明 | 由官方 adapter 处理 |

---

## 12. 与图片服务联动

| 部署 | `image.service` |
|------|-----------------|
| Node / Vercel | 默认 Sharp（build 优化远程 Medusa 图） |
| Cloudflare | `passthroughImageService()`（`ASTRO_DEPLOY_TARGET=cloudflare`） |

→ 详见 [image-optimization.md](image-optimization.md) §13.4

---

## 13. 验收清单

- [ ] `pnpm build` 日志含 `adapter: @astrojs/node`，`mode: server`
- [ ] `/cart`、`/checkout` 在 `pnpm preview` 下可访问（非 404）
- [ ] 未登录访问 `/account` → middleware 重定向 `/login`
- [ ] 产线非「仅静态托管 dist/client」
- [ ] `PUBLIC_SITE_URL` 与 sitemap 域名一致

---

## 14. 常见错误

| 错误 | 原因 | 修复 |
|------|------|------|
| `no-adapter-installed` | SSR 页无 adapter | 安装 `@astrojs/node` |
| `adapter-support-output-mismatch` | adapter 与 output 不兼容 | 用官方 adapter，勿混配 |
| SSR 页 404 on Nginx | 只部署了 client | 跑 `node dist/server/entry.mjs` 或反代 Node |
| build 无商品 | Loader 时 API 不可达 | CI 设 `PUBLIC_API_URL` |

---

## 15. 相关文档

- [implementation-status.md](implementation-status.md) §1
- [reference.md](reference.md) 部署命令
- [middleware-security.md](middleware-security.md)
- [image-optimization.md](image-optimization.md)
