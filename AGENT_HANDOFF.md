# 外部 Agent / Trae 交接入口

本仓库的**完整实施说明**在下方文档，请按顺序阅读后再改代码。

| 顺序 | 文档 | 内容 |
|------|------|------|
| 1 | [docs/00-agent-handoff.md](docs/00-agent-handoff.md) | **主交接文档**：目标、结构、命令、实现顺序、检查清单 |
| 2 | [docs/07-feature-spec.mdx](docs/07-feature-spec.mdx) | 功能规格、Admin 方案 A、API 前缀 |
| 3 | [docs/01-database-schema.mdx](docs/01-database-schema.mdx) | 102 表、字段、关系 |
| 4 | [docs/02-api-endpoints.mdx](docs/02-api-endpoints.mdx) | Medusa API 全量对照 + MVP 节 |
| 5 | [docs/03-business-workflows.mdx](docs/03-business-workflows.mdx) | 购物车→订单等工作流 |
| 6 | [docs/06-drizzle-migration-guide.mdx](docs/06-drizzle-migration-guide.mdx) | MikroORM → Drizzle |
| 7 | [AGENTS.md](AGENTS.md) | AI 全局规则摘要 |

Cursor 专用：

- `.cursor/rules/agent-handoff.mdc` — 与本仓库协作时的规则摘要  
- `.cursor/skills/hono-medusa-rebuild/SKILL.md` — Skill 正文（可被 Cursor 索引）

**技术栈冻结**：Hono + Drizzle + Bun/Node 入口 | Vite + React Router Admin | Astro 商城 | Hono RPC + `packages/validators` | 不修改 `apps/backend/`。
