# my-medusa-store-hono（新项目 — 唯一开工目录）

基于 Medusa PostgreSQL 表结构的 **Hono + Drizzle** 全栈电商，不运行 `@medusajs/medusa`。

## 快速开始

```powershell
cd D:\webstormProject\my-medusa-store-hono
pnpm run init
# 编辑 apps/server/.env 后
pnpm dev
```

## 本目录已包含

| 类别 | 路径 |
|------|------|
| 交接文档 | `docs/`（含 `00-agent-handoff.md`） |
| AI 入口 | `AGENTS.md`、`AGENT_HANDOFF.md`、`START_HERE.md`、`TRAE_KICKOFF_PROMPT.md` |
| Cursor | `.cursor/rules/`、`.cursor/skills/hono-medusa-rebuild/SKILL.md` |
| 脚本 | `scripts/init.ps1`、`sync-handoff-from-old.ps1`、`copy-dashboard-ui.ps1` |
| 后端 | `apps/server/` |
| Admin | `apps/admin/`（含已拷贝的 `dashboard-ui`） |
| 商城 | `apps/store-web/` |
| 共享包 | `packages/db`、`packages/validators` |

## 不含（故意不拷）

- `apps/backend/`（旧 Medusa，对照用兄弟目录 `../my-medusa-store/apps/backend/`）
- `packages/dashboard/`、`apps/storefront/`（已废弃方案）

## 命令

| 命令 | 说明 |
|------|------|
| `pnpm run init` | 初始化环境与依赖 |
| `pnpm run sync:handoff` | 从 `../my-medusa-store` 刷新 docs + `.cursor` |
| `pnpm run copy:dashboard-ui` | 重新拷贝 Medusa Dashboard UI |

- **Cursor**：打开仓库即可用 `.cursor/rules` + Skill  
- **Trae**：**不会自动读 `.cursor`**，请读 **`START_HERE.md`** 或复制 **`TRAE_KICKOFF_PROMPT.md`**
