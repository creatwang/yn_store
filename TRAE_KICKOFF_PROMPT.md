# Trae 开工提示词（可直接复制）

请在本仓库按以下规则继续实现。

## 重要：Trae 与 `.cursor` 目录

| 路径 | Cursor | Trae |
|------|--------|------|
| `.cursor/rules/*.mdc` | **自动加载** | **不会自动加载** |
| `.cursor/skills/**/SKILL.md` | **可自动匹配 Skill** | **不会自动加载** |
| `docs/00-agent-handoff.md` 等 | 可读 | **必须你明确要求阅读** |

**结论**：Trae **不能**像 Cursor 一样自动读 `.cursor`。请按下面「必读」列表**手动让 Trae 阅读**；规则内容以 `docs/00-agent-handoff.md` 为准（与 `.cursor/rules` 一致）。

## 开工前

```powershell
pnpm run init
```

配置 `apps/server/.env`：`DATABASE_URL`、`JWT_SECRET`。

## 必读（按顺序）

1. `docs/00-agent-handoff.md`
2. `docs/PROJECT_STATUS.md`（权威状态）
3. `AGENTS.md`
4. **`.cursor/skills/hono-medusa-rebuild/SKILL.md`**（可选；Trae 需手动 `@` 或粘贴路径，不会自动读）
5. 若需与 Cursor 规则完全一致，可再读 `.cursor/rules/agent-handoff.mdc`（同样需手动指定）

可选索引：`docs/MIGRATION.md`（从旧仓库迁移了什么）。

## 技术约束

- Hono + Drizzle + Vite Admin + Astro
- Admin **方案 A**：仅 `apps/admin`，不维护第二套 dashboard，不用 `@medusajs/js-sdk`
- API 前缀 `/api`；Hono **链式**路由；`apps/server/src/app.ts` 导出 `AppType`
- 校验：`packages/validators`；DB：`packages/db`；软删 `deleted_at IS NULL`
- 项目根目录：`D:\webstormProject\my-medusa-store-hono`（本仓库无 `apps/backend/`，对照 `../my-medusa-store/apps/backend/`）

## 交付前

先输出任务分解，再按模块实现。阶段结束前对照 `docs/00-agent-handoff.md` 第 10 节自检清单。
