# 文档索引（给人类与 Agent）

## 从这里开始（外部工具必看）

| 文档 | 说明 |
|------|------|
| [**00-agent-handoff.md**](00-agent-handoff.md) | **主交接**：目标、目录、规则、命令、实现顺序、自检清单 |
| [../AGENT_HANDOFF.md](../AGENT_HANDOFF.md) | 根目录入口，链到上表 |

## 蓝图（按主题）

| 文件 | 主题 |
|------|------|
| [07-feature-spec.mdx](07-feature-spec.mdx) | 功能规格、Admin 方案 A、模块与 API |
| [**08-target-architecture.mdx**](08-target-architecture.mdx) | **目标架构 v3**：/api + /app（public/app）、Docker、Bun compile |
| [01-database-schema.mdx](01-database-schema.mdx) | 102 张表、字段、关系 |
| [02-api-endpoints.mdx](02-api-endpoints.mdx) | Medusa REST 全量 + MVP 节 |
| [03-business-workflows.mdx](03-business-workflows.mdx) | 购物车→订单等业务流 |
| [06-drizzle-migration-guide.mdx](06-drizzle-migration-guide.mdx) | Drizzle 映射与软删、bigNumber |
| [04-implementation-plan.mdx](04-implementation-plan.mdx) | 分阶段计划（部分表述偏旧栈，以 handoff 为准） |
| [05-tech-conventions.mdx](05-tech-conventions.mdx) | 编码约定 |
| [**09-stitching-alignment.mdx**](09-stitching-alignment.mdx) | **缝合对齐规则**：Dashboard ↔ SDK 适配层 ↔ Hono Server |
| [**10-refactoring-plan.mdx**](10-refactoring-plan.mdx) | **完整重构计划**：阶段划分、文件模板、模块 Checklist、优先级矩阵 |
| [**11-feature-tracker.mdx**](11-feature-tracker.mdx) | **功能 ID 索引（已归档）**：逐行表格为历史快照；模块统计见文内，**缺口以 14 为准** |
| [**12-testing-plan.mdx**](12-testing-plan.mdx) | **自动化测试方案**：Vitest + Hono Test Client + Playwright E2E |
| [**14-admin-api-gap-matrix.md**](14-admin-api-gap-matrix.md) | **权威缺口表**：Admin ↔ API / client / hooks 对照 + P0 优先项（2026-05-30） |
| [**15-ai-improvement-tasks.md**](15-ai-improvement-tasks.md) | **AI 任务 backlog**：TASK-ID、验收命令、Wave 排期；文档项 TASK-DOC-001 已完成 |
| [**16-full-completion-playbook.md**](16-full-completion-playbook.md) | **全量收尾手册**：Phase 0–6 🟢 + DoD；下一步见 §1.4 / TASK-CLIENT-001 |
| [00-architecture-overview.mdx](00-architecture-overview.mdx) | 历史总览（若与 handoff 冲突以 handoff 为准） |

## 仓库级 AI 说明

- 根目录 [../AGENTS.md](../AGENTS.md)

## Cursor 专用

- `.cursor/rules/agent-handoff.mdc` — 全局协作规则
- `.cursor/rules/medusa-project.mdc` — 项目技术规则
- `.cursor/rules/admin-development.mdc` — Admin 开发
- `.cursor/rules/storefront-development.mdc` — Astro 商城
- `.cursor/skills/hono-medusa-rebuild/SKILL.md` — Skill 正文
