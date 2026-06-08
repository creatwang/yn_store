# CLAUDE.md

## 项目结构

```
apps/server/      # Hono API (:7000/api)
apps/admin/       # Vite Admin (:5173/app)
apps/storefront/  # Astro 商城 (:4321)
packages/db/      # Drizzle schema
packages/validators/
scripts/          # 见 scripts/README.md
```

Medusa 运行时对照（不在本仓库）：`../my-medusa-store/apps/backend/`

## 必读文档

| 文档 | 用途 |
|------|------|
| [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) | 完成度、API、测试 |
| [docs/REMAINING-WORK.md](docs/REMAINING-WORK.md) | 待办 |
| [docs/00-agent-handoff.md](docs/00-agent-handoff.md) | 硬规则 |
| [docs/09-stitching-alignment.mdx](docs/09-stitching-alignment.mdx) | 改 Admin / API 对齐 |
| [docs/ecommerce-c-end/implementation-status.md](docs/ecommerce-c-end/implementation-status.md) | C 端状态 |
| [docs/ecommerce-c-end/storefront-conventions.md](docs/ecommerce-c-end/storefront-conventions.md) | C 端编码约定 |

## Admin UI 开发

实现页面前，用 `pnpm run copy:dashboard-ui` 从 Medusa Dashboard 拷贝参考，或查 `@medusajs/dashboard` 官方源码。

- 业务代码：`apps/admin/src/routes/`
- RPC 客户端：`apps/admin/src/lib/api.ts`
- **禁止**在 Admin 使用 `@medusajs/js-sdk`

## 命令

```bash
pnpm dev                              # server + admin + storefront
pnpm --filter @my-store/server test   # API 测试
pnpm run copy:dashboard-ui            # 拷贝 Dashboard UI
pnpm run sync:draft-order-plugin      # 同步官方草稿订单插件参考
```

## Storefront 要点

- Astro 5 Hybrid，**禁止 React 岛**
- 数据：Content Loader ← Hono Store API
- 认证：JWT + httpOnly cookie，middleware 保护
- 部署：见 `docs/ecommerce-c-end/adapter-deployment.md`

## 核心规则

- Hono 路由**链式**定义，导出 `AppType`
- DB 查询过滤 `deleted_at IS NULL`
- 金额 `amount` + `raw_amount`
- 不修改 Medusa 已有表 DDL；新表 `custom_` 前缀
