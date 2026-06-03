# 外部 Agent / Trae 交接入口

本仓库的**完整实施说明**在下方文档，请按顺序阅读后再改代码。

| 顺序 | 文档 | 内容 |
|------|------|------|
| 1 | [docs/00-agent-handoff.md](docs/00-agent-handoff.md) | **主交接文档**：目标、结构、命令、硬规则、§9 实现快照 |
| 2 | [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) | 权威状态：API 矩阵、测试、技术债 |
| 3 | [docs/REMAINING-WORK.md](docs/REMAINING-WORK.md) | 未完成项（P2 / P3 / Admin 迭代 02） |
| 4 | [docs/QUICKSTART.md](docs/QUICKSTART.md) | 5 分钟启动 |
| 5 | [docs/01-database-schema.mdx](docs/01-database-schema.mdx) | 表与字段 |
| 6 | [docs/02-api-endpoints.mdx](docs/02-api-endpoints.mdx) | Medusa API 对照 + MVP 节 |
| 7 | [docs/03-business-workflows.mdx](docs/03-business-workflows.mdx) | 购物车→订单等工作流 |
| 8 | [docs/06-drizzle-migration-guide.mdx](docs/06-drizzle-migration-guide.mdx) | Drizzle 写法 |
| 9 | [docs/09-stitching-alignment.mdx](docs/09-stitching-alignment.mdx) | Dashboard ↔ API 缝合（改 Admin 必读） |
| 10 | [AGENTS.md](AGENTS.md) | AI 全局规则摘要 |
| 11 | [docs/README.md](docs/README.md) | **全部文档路径索引** |

Cursor 专用：

- `.cursor/rules/agent-handoff.mdc` — 规则摘要  
- `.cursor/skills/hono-medusa-rebuild/SKILL.md` — Skill 正文

**技术栈**：Hono + Drizzle + Bun/Node | Vite Admin | Astro 商城 | Hono RPC + `packages/validators`。

**本仓库无 `apps/backend/`**；Medusa 行为对照：`../my-medusa-store/apps/backend/`（只读，勿改）。
