# 迁移说明（已完成）

本目录 **`my-medusa-store-hono`** 已从旧仓库一次性打包，**无需再去找** `trae-ready` / `trae-starter`。

## 已迁入内容

- 全部 `docs/` 蓝图
- `.cursor/rules` + `.cursor/skills`
- `AGENTS.md`、`AGENT_HANDOFF.md`
- `scripts/` 三个 PowerShell 脚本
- `apps/server`、`apps/admin`、`apps/storefront`
- `packages/db`、`packages/validators`

## 未迁入（对照用）

- `apps/backend/` → `D:\webstormProject\my-medusa-store\apps\backend\`
- `packages/dashboard/`（已废弃）

## 从旧仓库全量同步（文档 + 代码 + .cursor）

```powershell
pnpm run migrate
pnpm run patch:hono-docs
```

仅刷新文档（不覆盖 apps/packages 代码）：

```powershell
pnpm run sync:handoff
pnpm run patch:hono-docs
```
