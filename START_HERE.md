# 开工入口（本目录 = 新项目根）

**路径**：`D:\webstormProject\my-medusa-store-hono`

## 1. 初始化

```powershell
pnpm run init
```

脚本在 **`scripts/`**（`init.ps1`、`sync-handoff-from-old.ps1`、`copy-dashboard-ui.ps1`）。

## 2. Trae 能不能读 `.cursor`？

**不能自动读。** `.cursor` 是给 Cursor 用的；Trae 不会自动加载 Rules/Skill。

| 工具 | `.cursor/rules` | `.cursor/skills` | 建议入口 |
|------|-----------------|------------------|----------|
| **Cursor** | 自动 | 自动 | 打开仓库即可 |
| **Trae** | 不自动 | 不自动 | 复制 **`TRAE_KICKOFF_PROMPT.md`** 或让其读 **`docs/00-agent-handoff.md`** |

## 3. 必读

1. `docs/00-agent-handoff.md`（Trae **首选**，含全部硬规则）
2. `docs/07-feature-spec.mdx`
3. `AGENTS.md`
4. `TRAE_KICKOFF_PROMPT.md`（**Trae 第一条消息粘贴本文件**）

## 4. 开发

配置 `apps/server/.env` 后：`pnpm dev`

## 5. 从旧仓库更新文档（可选）

```powershell
pnpm run sync:handoff
```

源目录默认：`../my-medusa-store`
