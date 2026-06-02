# 快速启动

> 从 clone 到浏览器看到后台，5 分钟。

## 前置条件

- Node.js ≥ 20 + pnpm ≥ 9
- PostgreSQL（本地或 Supabase），已有 Medusa 表结构
- 可选：Bun（`pnpm dev:bun` 需要）

## 1. 安装依赖

```bash
pnpm install
```

## 2. 配置环境变量

```bash
# apps/server/.env
DATABASE_URL=postgresql://user:password@localhost:5432/medusa
JWT_SECRET=your-secret-at-least-32-characters
PORT=9000
```

## 3. 启动开发环境

```bash
pnpm dev
```

三个进程自动并行启动：

| 进程 | 地址 | 说明 |
|------|------|------|
| **Server** | `http://localhost:9000/api` | Hono API 后端 |
| **Admin** | `http://localhost:5173/app` | Vite HMR 管理后台 |
| **Storefront** | `http://localhost:4321` | Astro C 端商城 |

## 4. 登录 Admin

打开 `http://localhost:5173/app/login`，用管理员邮箱密码登录。

如果还没有管理员账户，检查 `auth_identity` 和 `user` 表是否有数据。没有则需要通过数据库创建一个初始 admin。

## 5. 运行测试（可选）

```bash
pnpm --filter=@my-store/server test
```

## 常见问题

**登录失败 / 401**：检查 `JWT_SECRET` 是否 ≥ 32 字符，`user.email` 是否与登录邮箱一致。

**数据库连接失败**：确认 `DATABASE_URL` 正确，数据库包含 Medusa 表结构。

**Admin 接口报 404**：确认 Server 在 `:9000` 启动成功，Admin Vite proxy 配置指向正确端口。

## 生产构建

```bash
pnpm build:admin    # Admin → apps/server/public/app/
```

之后可以仅起 server 单进程：`http://localhost:9000/app/` + `http://localhost:9000/api`

## 更多

- [PROJECT_STATUS.md](PROJECT_STATUS.md) — 项目完成度
- [00-agent-handoff.md](00-agent-handoff.md) — 完整开发规范
