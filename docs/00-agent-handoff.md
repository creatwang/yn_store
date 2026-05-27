# Agent 交接文档 — Hono 全栈重写 Medusa 能力

> 本文档供 **Trae、Cursor、其他 AI 编码工具** 在克隆本仓库后，无需额外上下文即可按规范继续实现。  
> 与 `AGENTS.md`、`.cursor/rules/agent-handoff.mdc`、`.cursor/skills/hono-medusa-rebuild/SKILL.md` 保持一致。

### Trae 用户注意（`.cursor`）

| | Cursor | Trae |
|---|--------|------|
| `.cursor/rules/*.mdc` | 自动加载 | **不自动** |
| `.cursor/skills/**/SKILL.md` | 可自动匹配 | **不自动** |
| 应读文档 | 可读 handoff | **必须读本文档** 或 `TRAE_KICKOFF_PROMPT.md` |

Trae **可以**在对话中指定路径读取 `.cursor` 下文件，但**不会**像 Cursor 一样开箱即用。规则正文以**本文**为准。

---

## 1. 项目目标（必须理解）

1. **保留 Medusa v2.15.3 已有 PostgreSQL 表结构**（不删表、不改列语义）；业务用 **Drizzle** 读写。
2. **不依赖** `@medusajs/medusa` 运行时；**不修改** 旧 Medusa 后端（本仓库无 `apps/backend/`，对照 `../my-medusa-store/apps/backend/`）。
3. **自建 API**：`apps/server`（Hono），路径前缀 **`/api`**，与 Medusa REST 形状对齐（便于对照 `docs/02-api-endpoints.mdx`）。
4. **Admin**：`apps/admin` — **Vite + React Router + @medusajs/ui + Hono RPC**（**方案 A**：唯一开发入口；从 Medusa 源码拷 UI 进 admin，不维护第二套 dashboard 应用）。
5. **Storefront**：`apps/storefront` — **Astro**（已定），调用 `/api/store/*`。
6. **类型安全**：服务端 `export type AppType = typeof app`；客户端 `hc<AppType>()`；请求体用 **`packages/validators`** 的 Zod，前后端共用。

---

## 2. Monorepo 目录（当前约定）

> **本仓库 `my-medusa-store-hono`** 为独立新项目，**不含** `apps/backend/`。Medusa 行为对照：`../my-medusa-store/apps/backend/`。

```
apps/
  server/          # Hono：routes + services + workflows，entry.bun|node|cf|vercel
  admin/           # Vite Admin（唯一后台前端）
  storefront/      # Astro 商城

packages/
  db/              # Drizzle schema、getDb、generateId
  validators/      # Zod schema（@my-store/validators）

docs/              # 01–07 + 本文件
scripts/           # init、migrate、sync-handoff、copy-dashboard-ui（见 scripts/README.md）

.cursor/
  rules/           # Cursor 自动加载
  skills/hono-medusa-rebuild/SKILL.md
```

---

## 3. 文档阅读顺序（接到任务后先做）

| # | 文件 | 用途 |
|---|------|------|
| 1 | `docs/00-agent-handoff.md` | 本文件：全局约束与流程 |
| 2 | `docs/07-feature-spec.mdx` | 模块、页面、API、表、方案 A |
| 2b | `docs/08-target-architecture.mdx` | Admin `/app` 内嵌 server、何时 build、mount-app |
| 3 | `docs/01-database-schema.mdx` | 表与字段 |
| 4 | `docs/02-api-endpoints.mdx` | 全量路由；实现时对齐 **MVP** 节再扩展 |
| 5 | `docs/03-business-workflows.mdx` | 购物车→订单等流程 |
| 6 | `docs/06-drizzle-migration-guide.mdx` | Drizzle 写法、软删、bigNumber |
| 7 | `docs/04-implementation-plan.mdx` | 分阶段（部分内容仍写 Next，以本 handoff 技术栈为准） |
| 8 | `docs/05-tech-conventions.mdx` | 代码风格 |
| 9 | `docs/00-architecture-overview.mdx` | 历史总览；若与本文冲突以 **本文 + 07** 为准 |

---

## 4. 硬性规则（违反会导致 RPC/类型/数据错误）

### 4.1 Hono

- 路由必须 **链式** 定义：`new Hono().get().post().route()`；禁止 `app.get` 分句挂载后指望 `AppType` 完整。
- 子路由用 `new Hono()` 链式导出，在 `apps/server/src/app.ts` 用 `.route('/api/...', subApp)` 挂载。
- 必须 `export type AppType = typeof app` 且 `export { app }`。
- 校验：`@hono/zod-validator` + `@my-store/validators`。

### 4.2 数据库

- 所有业务查询过滤 **`deleted_at IS NULL`**（软删）。
- 金额：`amount` + `raw_amount`（见 `docs/06`）。
- ID：`generateId('prefix')`（见 `packages/db/src/utils/id.ts`）。
- 新表仅允许 **`custom_` 前缀**；禁止改 Medusa 已有表 DDL。

### 4.3 Admin（方案 A）

- **唯一**日常开发目录：`apps/admin`（`pnpm dev --filter=@my-store/admin` → `http://localhost:5173/app/`）。
- **日常开发无需** `pnpm build:admin`；只有 server 要提供 `/app`（生产、Docker、`pnpm dev:admin-on-server`）时才 build 到 `apps/server/public/app`。详见 **`docs/08-target-architecture.mdx`**。
- 管理界面路径 **`/app`**；REST API 仍在 **`/api/*`**（如 `/api/admin/products`）。
- 禁止 Vite `alias` 到外部 dashboard 源码；禁止在 Admin 使用 `@medusajs/js-sdk`。
- UI 从 Medusa 拷贝进 `apps/admin/src/`（脚本：`pnpm run copy:dashboard-ui`），拷贝后改写 hooks 为 Hono RPC。

### 4.4 仓库

- **不要**改 `apps/backend/`。
- 用户未要求时 **不要** `git commit`；不要 `git push --force`。

---

## 5. API 定义在哪里

| 层级 | 路径 |
|------|------|
| 汇总挂载 + `AppType` | `apps/server/src/app.ts` |
| 路由处理器 | `apps/server/src/routes/**/*.ts`（链式） |
| 业务逻辑 | `apps/server/src/services/**/*.ts` |
| 跨模块事务 | `apps/server/src/workflows/**/*.ts`（待建） |
| 请求 Schema | `packages/validators/src/**/*.ts` |
| Drizzle 表 | `packages/db/src/schema/**/*.ts` |
| Admin RPC 客户端 | `apps/admin/src/lib/api.ts` + `hooks/*.ts` |

对照清单：`docs/02-api-endpoints.mdx`（实现一条勾一条）。

---

## 6. 环境变量

复制并填写：

- `apps/server/.env.example` → `apps/server/.env`：`DATABASE_URL`、`JWT_SECRET`、`PORT`
- `apps/admin/.env.example`：开发可 `VITE_API_URL=` 空串，走 Vite `proxy` 的 `/api`
- `apps/storefront/.env.example`：`PUBLIC_API_URL=http://localhost:9000`

---

## 7. 常用命令

```bash
pnpm install

# 开发（三进程，改 Admin 无需 build）
pnpm dev
# 或分别：server :9000 /api  |  admin :5173 /app  |  store :4321

# 与生产一致：先 build Admin 静态，仅起 server（:9000/app + :9000/api）
pnpm dev:admin-on-server

# 生产静态与 Docker
pnpm build:admin          # → apps/server/public/app
pnpm build:backend        # build:admin + server 检查

# 类型检查（示例）
pnpm typecheck

# 从 Medusa Dashboard 拷贝 UI 块到 admin（Windows）
pnpm run copy:dashboard-ui
```

根 `package.json` 的 `dev`/`build` 以仓库内实际 scripts 为准。架构说明见 **`docs/08-target-architecture.mdx`**。

---

## 8. 实现顺序（建议严格执行）

1. **补齐 `packages/db` schema**：按 `docs/01` 模块拆文件，至少覆盖 MVP 涉及表。
2. **补齐 `packages/validators`**：与每个 `POST/PATCH` 对齐。
3. **`apps/server` 路由**：先 `auth` → `admin/products` → `store/products`，再按 `docs/02` MVP 扩展 cart、order、payment、customer、region、shipping。
4. **`apps/admin` 页面**：登录 → Shell → 商品列表/新建/编辑；再按模块加路由与 `hooks`。
5. **`apps/storefront`**：首页列表、详情；再 cart/checkout（React islands）。
6. **生产 All-in-One（可选）**：`astro build` + `vite build` 产物拷到 `apps/server/static/`，在 `app.ts` 加 `serveStatic`（Bun 用 `hono/bun`，Node 用 `@hono/node-server/serve-static`）。

---

## 9. 当前已实现 vs 待办（接手时自检）

**已实现（骨架级）**：`GET /api/health`；`POST /api/auth/user/emailpass`、`/api/auth/token/refresh`、`GET /api/auth/session`；`GET|POST /api/admin/products*`；`GET /api/store/products*`；Admin 登录/商品页；Store 首页与详情。

**待办**：其余 `docs/02` 模块；`workflows/`；`packages/db` 全表映射；生产静态托管；Cloudflare `wrangler.toml`（若需要）。

---

## 10. 交付自检清单（PR / 阶段结束前）

- [ ] 新增路由均为链式，`AppType` 在 admin 中 `tsc` 无报错。
- [ ] 所有 DB 查询含软删条件（或等价封装）。
- [ ] 新 API 有对应 Zod +（若需要）Admin/Store 调用。
- [ ] 中文用户可见文案。
- [ ] 未引入 `@medusajs/js-sdk` 到 admin。
- [ ] 未修改 `apps/backend/`。

---

## 11. 冲突处理

- `docs/00-architecture-overview.mdx`、`docs/04-implementation-plan.mdx` 若仍写 **Next.js + Medusa 后端不动**，视为**过期表述**；实施以 **本文 + `docs/07-feature-spec.mdx` + `AGENTS.md`** 为准。
- 有疑问优先查 `docs/01`（表是否存在）与 `docs/02`（路径是否已有 Medusa 先例）。

---

## 12. 联系与本文件维护

更新架构或技术栈时，请同步修改：**本文件**、`AGENT_HANDOFF.md`、`AGENTS.md`、`.cursor/rules/agent-handoff.mdc`、`.cursor/skills/hono-medusa-rebuild/SKILL.md`。
