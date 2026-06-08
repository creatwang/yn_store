# 开工入口

**路径**：`D:\webstormProject\my-medusa-store-hono`

## 1. 初始化

```powershell
pnpm run init
```

配置 `apps/server/.env`：`DATABASE_URL`、`JWT_SECRET`。

## 2. 开发

```powershell
pnpm dev
```

| 服务 | 地址 |
|------|------|
| API | http://localhost:7000/api |
| Admin | http://localhost:5173/app/ |
| Store | http://localhost:4321 |

## 3. 必读文档

1. [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) — 真实完成度
2. [docs/REMAINING-WORK.md](docs/REMAINING-WORK.md) — 待办
3. [docs/00-agent-handoff.md](docs/00-agent-handoff.md) — 硬规则
4. [docs/README.md](docs/README.md) — 文档索引
5. [AGENTS.md](AGENTS.md)

## 4. Trae / 外部 AI

Trae **不会自动读** `.cursor/rules`。请让其阅读 `docs/00-agent-handoff.md` + `docs/PROJECT_STATUS.md`。

## 5. 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm --filter @my-store/server test` | 后端 API 测试 |
| `pnpm --filter @my-store/admin test:e2e` | Admin Playwright smoke |
| `pnpm run copy:dashboard-ui` | 重新拷贝 Medusa Dashboard UI |
| `pnpm run seed:admin` | 创建测试管理员 |

脚本说明 → [scripts/README.md](scripts/README.md)
