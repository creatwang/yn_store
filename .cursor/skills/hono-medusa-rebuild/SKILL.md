---
name: hono-medusa-rebuild
description: 在 my-medusa-store 中用 Hono+Drizzle 重写 Medusa 能力、Vite Admin（方案 A）、Astro 商城；读 docs/00-agent-handoff.md 后实施。
---

# Hono + Medusa 表 全栈重建

## 何时使用本 Skill

- 在本仓库实现或扩展 **Hono API**、**Drizzle schema**、**Admin（Vite）**、**Store（Astro）**。
- 需要与 **Medusa v2.15.3 数据库** 对齐，但不运行 `@medusajs/medusa`。

## 必读（按顺序）

1. `docs/00-agent-handoff.md` — **主交接**，规则与命令全集  
2. `docs/07-feature-spec.mdx` — 功能与方案 A  
3. `docs/01-database-schema.mdx` — 表结构  
4. `docs/02-api-endpoints.mdx` — API 对照与 MVP  

## 不可违反

- Hono 路由 **链式**；`export type AppType = typeof app`（`apps/server/src/app.ts`）。
- 查询过滤 `deleted_at IS NULL`；不改 `apps/backend/`；Admin 不用 `js-sdk`。
- Admin **仅** `apps/admin`；UI 拷贝自 Medusa 源码，不 alias 外部 dashboard 源码。

## 关键路径

| 用途 | 路径 |
|------|------|
| API 汇总 | `apps/server/src/app.ts` |
| 路由 | `apps/server/src/routes/` |
| 业务 | `apps/server/src/services/` |
| Zod | `packages/validators/src/` |
| Drizzle | `packages/db/src/schema/` |
| Admin RPC | `apps/admin/src/lib/api.ts` |

## 命令速查

```bash
pnpm install
pnpm dev --filter=@my-store/server
pnpm dev --filter=@my-store/admin
pnpm dev --filter=@my-store/storefront
pnpm run copy:dashboard-ui
```

## 输出期望

- 新模块：routes + services + validators +（可选）db schema + admin hooks/routes + store 页面。
- 保持 TypeScript 通过 `tsc --noEmit`（server/admin）。

详细检查清单见 `docs/00-agent-handoff.md` 第 10 节。
