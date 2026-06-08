# scripts

日常开发脚本（迁移/一次性 port 脚本已移除）。

| 文件 | 命令 | 用途 |
|------|------|------|
| `init.ps1` | `pnpm run init` | 检查 Node/pnpm、`.env`、安装依赖 |
| `kill-dev-ports.ps1` | `pnpm dev` 前自动 | 释放 7000 / 5173 / 4321 |
| `check-db.ps1` | `pnpm run check:db` | 检查 `DATABASE_URL` 连通 |
| `check-runtime-db.mjs` | `pnpm run check:runtime-db` | 运行时 DB 池验收 |
| `copy-dashboard-ui.ps1` | `pnpm run copy:dashboard-ui` | 从 Medusa Dashboard 拷贝 UI |
| `sync-validators-from-medusa.mjs` | `pnpm run sync:validators` | 同步官方 Zod validators |
| `sync-official-draft-order-plugin.mjs` | `pnpm run sync:draft-order-plugin` | 同步官方草稿订单插件参考 |
| `drop-legacy-promotion-schema.mjs` | `pnpm run db:drop-legacy-promotion` | 清理旧 promotion 表结构 |
| `release/compile.ts` | `pnpm run compile` | 发布构建 |

**Server 内置**（`apps/server/package.json`）：`seed:admin`、`reset:passwords`、`test`。

**Admin**（`apps/admin/scripts/`）：`copy-official-stubs.ps1` — 拷贝官方 stub 组件。

## 典型开工

```powershell
pnpm run init
# 编辑 apps/server/.env
pnpm dev
```
