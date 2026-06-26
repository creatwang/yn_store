# my-medusa-store-hono（新项目 — 唯一开工目录）

基于 Medusa PostgreSQL 表结构的 **Hono + Drizzle** 全栈电商，不运行 `@medusajs/medusa`。

---

## 项目架构

```
my-medusa-store-hono/
├── apps/
│   ├── server/          # Hono 后端 API（多运行时支持）
│   ├── admin/           # Vite Admin 管理后台
│   └── storefront/       # Astro C 端商城
├── packages/
│   ├── db/              # Drizzle ORM Schema + 数据库客户端
│   └── validators/      # 共享 Zod 验证器
├── docs/                # 蓝图文档
└── scripts/             # 辅助脚本
```

---

## 依赖关系

### Monorepo 工作区依赖

| 包名 | 路径 | 被哪些模块依赖 |
|------|------|----------------|
| `@my-store/db` | `packages/db` | `@my-store/server` |
| `@my-store/validators` | `packages/validators` | `@my-store/server`、`@my-store/admin` |
| `@my-store/server` | `apps/server` | `@my-store/admin`（仅类型） |

### 外部依赖

| 技术栈 | 用途 |
|--------|------|
| **Hono** | 后端 Web 框架 |
| **Drizzle ORM** | PostgreSQL ORM |
| **Zod** | 类型安全验证 |
| **Vite** | Admin 前端构建工具 |
| **React Router** | Admin 路由 |
| **@medusajs/ui** | Admin UI 组件库 |
| **Astro** | C 端商城框架 |
| **TanStack Query** | 数据缓存与获取 |
| **Bun** | 推荐后端运行时（也支持 Node.js） |

---

## 环境准备

### 前置要求

- **Node.js** >= 20
- **pnpm** >= 10.17.1
- **Bun**（推荐，可选）
- **PostgreSQL** 数据库（或 Supabase）

### 安装依赖

```powershell
# 1. 进入项目目录
cd D:\webstormProject\my-medusa-store-hono

# 2. 安装所有依赖（包括 workspace 包）
pnpm install
```

### 配置环境变量

复制并编辑各服务的 `.env` 文件：

```powershell
# Server 后端
Copy-Item apps/server/.env.example apps/server/.env
# 编辑 apps/server/.env，配置 DATABASE_URL、JWT_SECRET 等

# Admin 前端（开发时可留空，使用 Vite proxy）
Copy-Item apps/admin/.env.example apps/admin/.env

# Store 前端
Copy-Item apps/storefront/.env.example apps/storefront/.env
```

**Server 环境变量 (`apps/server/.env`)：**
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/medusa
JWT_SECRET=change-me-to-a-secure-secret-at-least-32-chars
PORT=7000
NODE_ENV=development
```

---

## 启动方式

### 方式一：一键启动所有服务（推荐）

```powershell
pnpm dev
```
这会同时启动：
- `@my-store/server`（后端，端口 7000）
- `@my-store/admin`（Admin 前端，端口 5173）
- `@my-store/storefront`（Store 前端，端口 4321）

---

### 方式二：单独启动各服务

#### 1. 启动后端 Server

```powershell
# 使用 Bun（推荐）
pnpm dev --filter=@my-store/server

# 或使用 Node.js
cd apps/server
pnpm dev:node
```

**端口：** http://localhost:7000  
**API 基础路径：** `/api`

**Server 命令说明：**
| 命令 | 作用 |
|------|------|
| `pnpm dev` | Bun 开发模式（带 watch） |
| `pnpm dev:node` | Node.js 开发模式（带 watch） |
| `pnpm build` | TypeScript 类型检查 |
| `pnpm start` | Bun 生产模式 |
| `pnpm start:node` | Node.js 生产模式 |

---

#### 2. 启动 Admin 管理后台

```powershell
pnpm dev --filter=@my-store/admin
```

**端口：** http://localhost:5173  
**访问地址：** http://localhost:5173/app/

**Admin 命令说明：**
| 命令 | 作用 |
|------|------|
| `pnpm dev` | Vite 开发模式（HMR） |
| `pnpm build` | 构建生产版本 |
| `pnpm preview` | 预览构建结果 |

---

#### 3. 启动 Store 商城前端

```powershell
pnpm dev --filter=@my-store/storefront
```

**端口：** http://localhost:4321  
**访问地址：** http://localhost:4321

**Store 命令说明：**
| 命令 | 作用 |
|------|------|
| `pnpm dev` | Astro 开发模式 |
| `pnpm build` | 构建生产版本 |
| `pnpm preview` | 预览构建结果 |

---

## 同步依赖关系

### 安装新依赖

```powershell
# 给根目录安装依赖（devDependencies）
pnpm add -Dw <package-name>

# 给特定 workspace 安装依赖
pnpm add <package-name> --filter @my-store/server
pnpm add <package-name> --filter @my-store/admin
pnpm add <package-name> --filter @my-store/db
```

### 移除依赖

```powershell
pnpm remove <package-name> --filter @my-store/server
```

### 同步 workspace 依赖

修改 `package.json` 后，运行：
```powershell
pnpm install
```

---

## 项目结构与已实现功能

### 数据库 Schema (`packages/db/src/schema/`)

| 模块 | 文件 | 表数量 | 状态 |
|------|------|--------|------|
| Product | `product.ts` | 10 张 | ✅ 已完成 |
| Auth | `auth.ts` | 4 张 | ✅ 已完成 |
| Order | `order.ts` | 23 张 | ✅ 已完成 |
| Cart | `cart.ts` | 9 张 | ✅ 已完成 |
| Customer | `customer.ts` | 4 张 | ✅ 已完成 |
| Payment | `payment.ts` | 8 张 | ✅ 已完成 |
| Fulfillment | `fulfillment.ts` | 12 张 | ✅ 已完成 |
| Inventory | `inventory.ts` | 3 张 | ✅ 已完成 |
| Pricing | `pricing.ts` | 6 张 | ✅ 已完成 |
| Region | `region.ts` | 10+ 张 | ✅ 已完成 |

### API 服务 (`apps/server/src/`)

| 模块 | 服务 | Admin 路由 | Store 路由 | 状态 |
|------|------|------------|------------|------|
| Auth | `auth.service.ts` | ✅ | ✅ | ✅ 已完成 |
| Product | `product.service.ts` | ✅ | ✅ | ✅ 已完成 |
| Order | `order.service.ts` | ✅ | ✅ | ✅ 已完成 |
| Cart | `cart.service.ts` | — | ✅ | ✅ 已完成 |
| Customer | `customer.service.ts` | ✅ | ✅ | ✅ 已完成 |

### API 端点

**完整挂载矩阵** → [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) · **与 Medusa 差异** → [`docs/API-IMPLEMENTATION-GAP.md`](docs/API-IMPLEMENTATION-GAP.md)

**常用前缀（均经 `/api`）：**

| 前缀 | 说明 |
|------|------|
| `/api/admin/*` | 后台：products、orders、customers、returns、claims、draft-orders 等 60+ |
| `/api/store/*` | 商城：products、carts、orders、customers 等 |
| `/api/auth/*` | 客户/管理员 JWT 会话 |

---

## 其他命令

| 命令 | 说明 |
|------|------|
| `pnpm run init` | 初始化环境与依赖 |
| `pnpm run copy:dashboard-ui` | 重新拷贝 Medusa Dashboard UI |
| `pnpm run check:runtime-db` | DB 池验收 |
| `pnpm typecheck` | TypeScript 检查 |
| `pnpm build` | 构建所有服务 |

---

## 开发指南

### 必读文档

1. `docs/00-agent-handoff.md` — 交接与硬规则
2. `docs/PROJECT_STATUS.md` — 权威状态（API / 测试）
3. `docs/REMAINING-WORK.md` — 未完成项
4. `docs/README.md` — **文档索引**
5. `docs/QUICKSTART.md` — 快速启动
6. `docs/ecommerce-c-end/storefront-configuration.md` — **C 端商城语言/货币配置（运营向）**
7. `AGENTS.md` — AI 规则摘要

### 核心规则

- **Hono 路由必须链式定义**（RPC 类型推断要求）
- **所有查询过滤 `deleted_at IS NULL`**（软删除）
- **Admin 唯一入口是 `apps/admin`**，不用 `@medusajs/js-sdk`
- **不修改 Medusa 已有表结构**，新增表用 `custom_` 前缀

---

## 本目录已包含

| 类别 | 路径 |
|------|------|
| 文档 | `docs/README.md`、`docs/PROJECT_STATUS.md` |
| AI 入口 | `AGENTS.md`、`START_HERE.md` |
| Cursor | `.cursor/rules/`、`.cursor/skills/hono-medusa-rebuild/SKILL.md` |
| 脚本 | `scripts/`（见 `scripts/README.md`） |
| 后端 | `apps/server/` |
| Admin | `apps/admin/`（含已拷贝的 `dashboard-ui`） |
| 商城 | `apps/storefront/` |
| 共享包 | `packages/db`、`packages/validators` |

## 不含（故意不拷）

- `apps/backend/`（旧 Medusa，对照用兄弟目录 `../my-medusa-store/apps/backend/`）
- `packages/dashboard/`（已废弃，UI 在 `apps/admin/src/`）

---

- **Cursor**：打开仓库即可用 `.cursor/rules` + Skill  
- **Trae**：读 **`START_HERE.md`** 与 **`docs/00-agent-handoff.md`**
