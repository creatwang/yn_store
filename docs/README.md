# 文档索引

## 入口

| 文档 | 说明 |
|------|------|
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | **项目状态 — 代码核实的单一事实来源**（API 矩阵、测试覆盖、技术债） |
| [00-agent-handoff.md](00-agent-handoff.md) | 项目目标、目录结构、开发规则、命令 |
| [QUICKSTART.md](QUICKSTART.md) | **5 分钟快速启动**：clone 后第一步跑什么 |

## AI 会话记忆

| 路径 | 说明 |
|------|------|
| [.claude/memory/](../.claude/memory/) | 跨对话持久记忆（用户偏好、架构事实、项目状态快照） |
| [.claude/memory/MEMORY.md](../.claude/memory/MEMORY.md) | 记忆索引 |

## C 端（Storefront / Astro）

| 文档 | 说明 |
|------|------|
| [ecommerce-c-end/full-tech-stack.md](ecommerce-c-end/full-tech-stack.md) | 全栈技术方案 |
| [ecommerce-c-end/adoption-matrix.md](ecommerce-c-end/adoption-matrix.md) | 功能 × Astro 适配矩阵 + 三阶段路线 |
| [ecommerce-c-end/implementation-status.md](ecommerce-c-end/implementation-status.md) | C 端实现状态 |
| [ecommerce-c-end/storefront-conventions.md](ecommerce-c-end/storefront-conventions.md) | 编码规范 |
| [ecommerce-c-end/adapter-deployment.md](ecommerce-c-end/adapter-deployment.md) | 部署方案 |

## 参考（历史）

| 文档 | 说明 |
|------|------|
| [09-stitching-alignment.mdx](09-stitching-alignment.mdx) | Dashboard ↔ Hono Server 缝合规则 |
| [12-testing-plan.mdx](12-testing-plan.mdx) | 测试方案 |
| [01-database-schema.mdx](01-database-schema.mdx) | 数据库表结构 |
| [02-api-endpoints.mdx](02-api-endpoints.mdx) | Medusa REST API 参考 |
| [03-business-workflows.mdx](03-business-workflows.mdx) | 业务流 |
| [10-refactoring-plan.mdx](10-refactoring-plan.mdx) | 重构计划 |
| [MIGRATION.md](MIGRATION.md) | 迁移指南 |

## 已归档

- `11-feature-tracker.mdx` — 功能跟踪（被 PROJECT_STATUS.md 替代）
- `14-admin-api-gap-matrix.md` — 缺口表（被 PROJECT_STATUS.md 替代）
- `15-ai-improvement-tasks.md` — 任务 backlog（被 PROJECT_STATUS.md 替代）
- `16-full-completion-playbook.md` — 收尾手册（被 PROJECT_STATUS.md 替代）
- `05-tech-conventions.mdx` — 编码约定（已过期，Next.js 示例不适用当前 Vite + Hono 栈；规范见 CLAUDE.md 和 storefront-conventions.md）
- `07-feature-spec.mdx` — 功能规格（已过期，标记模块"待实现"但实际已完成；以 PROJECT_STATUS.md 为准）
