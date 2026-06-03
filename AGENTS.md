# AI 开发指南 — 跨境电商平台 (Hono 全栈)

> **外部工具 / Trae / 其他 Agent 完整交接**：请先读 [`docs/00-agent-handoff.md`](docs/00-agent-handoff.md)，根目录 [`AGENT_HANDOFF.md`](AGENT_HANDOFF.md) 为索引。  
> Cursor Skill：`.cursor/skills/hono-medusa-rebuild/SKILL.md`；规则：`.cursor/rules/agent-handoff.mdc`。

## 项目概述

基于 Medusa v2.15.3 **PostgreSQL 表结构** 重写的跨境电商平台，不依赖 `@medusajs/medusa` 运行时。

- **后端 API**: Hono + Drizzle ORM + Bun（主力运行时）
- **Admin 后台**: Vite + React Router + `@medusajs/ui`（复用 Medusa Dashboard 组件）
- **C 端商城**: Astro
- **类型安全**: Hono RPC（`hc<AppType>()`）+ 共享 Zod validators
- **数据库**: Supabase PostgreSQL（Medusa 已有表，不修改结构）

## 项目结构

```
apps/server/         # 后台运行时：/api + /app（public/app 静态）
apps/admin/          # Admin 源码 → build 到 server/public/app
apps/storefront/     # Astro 商城，独立部署，PUBLIC_API_URL → server
apps/backend/        # 旧 Medusa 后端（参考用，不修改）
packages/db/         # Drizzle schema + 查询
packages/validators/ # 共享 Zod schema
docs/                # 蓝图（08-target-architecture.mdx）
```

**本地地址**：API `http://localhost:7000/api`；Admin 挂载后 `http://localhost:7000/app/`；Vite dev `http://localhost:5173/app/`

**开发是否 build**：日常 `pnpm dev` **不需要** build；只有 server 提供 `/app` 时才 `pnpm build:admin`。见 [`docs/08-target-architecture.mdx`](docs/08-target-architecture.mdx)。

**脚本**：`pnpm build:admin` | `pnpm build:backend` | `pnpm dev:admin-on-server` | `pnpm build:release`

## 核心规则

### 1. API 开发（Hono）

- 路由**必须链式定义**（RPC 类型推断要求）
- 使用 `zValidator` + `@my-store/validators` 校验请求
- 业务逻辑放在 `services/`，复杂流程放 `workflows/`
- 导出 `AppType = typeof app` 供前端 RPC 客户端使用
- 所有查询过滤 `deleted_at IS NULL`

### 2. 前端 API 调用

- Admin：`import { api } from '@/lib/api'` — Hono RPC 客户端
- 数据缓存：TanStack Query v5
- **不要**手写 fetch URL 和响应类型
- 表单：`react-hook-form` + `zodResolver` + 共享 validators

### 3. 参考文档

- **`docs/00-agent-handoff.md`** — **外部 Agent / Trae 完整交接（必读）**
- `docs/README.md` — 文档索引
- `docs/PROJECT_STATUS.md` — **项目状态（优先阅读）**
- `docs/01-database-schema.mdx` — 数据库表结构
- `docs/02-api-endpoints.mdx` — Medusa API 对照
- `docs/03-business-workflows.mdx` — 业务流程
- `docs/06-drizzle-migration-guide.mdx` — Drizzle 映射

### 4. 数据库规范

- 不修改 Medusa 已有表结构
- 新增表使用 `custom_` 前缀
- ID 生成：`generateId('prod')` → `prod_xxx`
- 金额字段：`amount` + `raw_amount` 双列

### 5. Admin UI（方案 A）

- **唯一开发入口**：`apps/admin`（Vite HMR），命令：`pnpm dev --filter=@my-store/admin`
- 组件与页面统一在 `apps/admin/src/` 维护，禁止维护第二套 dashboard 应用
- 复用 UI：从 Medusa 源码（`apps/backend/node_modules/@medusajs/dashboard` 或官方仓库 tag）拷贝到 `apps/admin/src/`（见 `pnpm run copy:dashboard-ui`）
- 使用 `@medusajs/ui`，不引入 Shadcn；所有 UI 文本使用中文

## API 基础 URL

```
开发: http://localhost:7000/api
Admin API:  /api/admin/*
Store API:  /api/store/*
Auth:       POST /api/auth/user/emailpass
```

## 多运行时入口

| 文件 | 命令 |
|------|------|
| `apps/server/entry.node.ts` | `pnpm dev --filter=@my-store/server`（默认） |
| `apps/server/entry.bun.ts` | `pnpm dev:bun --filter=@my-store/server` |
| `apps/server/entry.cf-worker.ts` | Cloudflare Workers |
| `apps/server/entry.vercel.ts` | Vercel Edge |
