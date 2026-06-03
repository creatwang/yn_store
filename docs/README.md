# 文档全集索引

> **核实日期**：2026-06-02  
> 本文件列出仓库内**全部**文档路径、用途与是否仍维护。接手开发**只信**「权威」列中的文件。

---

## 权威（单一事实来源，必维护）

| 文档 | 用途 |
|------|------|
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | 后端 + Admin API 矩阵、完成度、测试、技术债 |
| [REMAINING-WORK.md](REMAINING-WORK.md) | 未完成项（当前仅 **P2 产品化** + P3 可选 + Admin 迭代 02 边缘） |
| [00-agent-handoff.md](00-agent-handoff.md) | AI/人协作：目标、硬规则、命令、§9 实现快照 |
| [QUICKSTART.md](QUICKSTART.md) | clone → `.env` → `pnpm dev` |
| [ecommerce-c-end/implementation-status.md](ecommerce-c-end/implementation-status.md) | C 端（Astro）实现状态 |

---

## 根目录（仓库级）

| 文档 | 用途 | 维护 |
|------|------|:----:|
| [../START_HERE.md](../START_HERE.md) | 开工入口、`pnpm run init`、Trae vs Cursor | ✅ |
| [../README.zh-CN.md](../README.zh-CN.md) | 中文项目说明、架构、环境、命令 | ✅ |
| [../AGENTS.md](../AGENTS.md) | AI 规则摘要 | ✅ |
| [../AGENT_HANDOFF.md](../AGENT_HANDOFF.md) | 外部 Agent 阅读顺序索引 | ✅ |
| [../CLAUDE.md](../CLAUDE.md) | Claude 专用说明 | ✅ |
| [../TRAE_KICKOFF_PROMPT.md](../TRAE_KICKOFF_PROMPT.md) | Trae 首条消息粘贴 | ✅ |
| [../scripts/README.md](../scripts/README.md) | init / sync / copy-dashboard 脚本 | ✅ |

---

## 后端 / Admin / 运维（`docs/*.md`）

| 文档 | 用途 | 维护 |
|------|------|:----:|
| [workflow-plan.md](workflow-plan.md) | Workflow 引擎 vs rollback vs `db.transaction` | ✅ |
| [ADMIN-UI-ITERATION-01.md](ADMIN-UI-ITERATION-01.md) | Admin 订单/RMA UI 迭代 01（S1–S4 已完成） | ✅ 历史+验收 |
| [DB-POOL-CONCURRENCY.md](DB-POOL-CONCURRENCY.md) | Supabase :5432/:6543、连接池、并发 | ✅ |
| [ORDERS-PRODUCTS-1TO1.md](ORDERS-PRODUCTS-1TO1.md) | 订单行与产品 1:1 对齐说明 | ✅ |
| [DRAFT-ORDERS-1TO1.md](DRAFT-ORDERS-1TO1.md) | 草稿订单与产品 1:1 对齐说明 | ✅ |
| [MIGRATION.md](MIGRATION.md) | 迁移指南 | ✅ |

---

## 蓝图参考（`docs/*.mdx`，设计对照用）

| 文档 | 用途 | 维护 |
|------|------|:----:|
| [00-architecture-overview.mdx](00-architecture-overview.mdx) | 历史架构总览（文首已注明以 handoff 为准） | 参考 |
| [01-database-schema.mdx](01-database-schema.mdx) | 表与字段 | 参考 |
| [02-api-endpoints.mdx](02-api-endpoints.mdx) | Medusa REST 全量对照 | 参考 |
| [03-business-workflows.mdx](03-business-workflows.mdx) | 购物车→订单等业务流 | 参考 |
| [04-implementation-plan.mdx](04-implementation-plan.mdx) | 分阶段计划（含 Next.js 旧表述） | 参考 |
| [06-drizzle-migration-guide.mdx](06-drizzle-migration-guide.mdx) | Drizzle 写法、软删、金额 | 参考 |
| [08-target-architecture.mdx](08-target-architecture.mdx) | Admin build、`/app` 挂载、All-in-One | 参考 |
| [09-stitching-alignment.mdx](09-stitching-alignment.mdx) | Dashboard ↔ Hono **缝合规则** | 参考（改 Admin 必读） |
| [10-refactoring-plan.mdx](10-refactoring-plan.mdx) | 重构计划 | 参考 |
| [12-testing-plan.mdx](12-testing-plan.mdx) | 测试方案 | 参考 |
| [13-architecture-conflicts.mdx](13-architecture-conflicts.mdx) | 架构冲突记录 | 参考 |

---

## 已归档（勿作状态依据）

| 文档 | 改用 |
|------|------|
| [11-feature-tracker.mdx](11-feature-tracker.mdx) | [PROJECT_STATUS.md](PROJECT_STATUS.md) |
| `05-tech-conventions.mdx` | 已删除；规范见 `CLAUDE.md`、`ecommerce-c-end/storefront-conventions.md` |
| `07-feature-spec.mdx` | 已删除；以 PROJECT_STATUS 为准 |
| `14-admin-api-gap-matrix.md` | 已删除；合并入 PROJECT_STATUS |
| `15-ai-improvement-tasks.md` | 已删除；合并入 PROJECT_STATUS / REMAINING-WORK |
| `16-full-completion-playbook.md` | 已删除；合并入 PROJECT_STATUS / REMAINING-WORK |

---

## C 端 `docs/ecommerce-c-end/`（共 18 个文件）

| 文档 | 用途 |
|------|------|
| [SKILL.md](ecommerce-c-end/SKILL.md) | Skill 入口与导航 |
| [implementation-status.md](ecommerce-c-end/implementation-status.md) | **C 端状态（权威）** |
| [full-tech-stack.md](ecommerce-c-end/full-tech-stack.md) | 全栈技术方案 |
| [adoption-matrix.md](ecommerce-c-end/adoption-matrix.md) | 功能 × Astro 适配 + 路线 |
| [storefront-conventions.md](ecommerce-c-end/storefront-conventions.md) | 目录、env、禁止项 |
| [adapter-deployment.md](ecommerce-c-end/adapter-deployment.md) | Vercel / Docker / CI |
| [islands-strategy.md](ecommerce-c-end/islands-strategy.md) | 岛策略（禁 React） |
| [native-html-components.md](ecommerce-c-end/native-html-components.md) | 原生 HTML 组件 |
| [cart-checkout-auth.md](ecommerce-c-end/cart-checkout-auth.md) | 购物车 / 结算 / 登录 |
| [middleware-security.md](ecommerce-c-end/middleware-security.md) | middleware / 会话 |
| [seo-and-metadata.md](ecommerce-c-end/seo-and-metadata.md) | SEO / sitemap / JSON-LD |
| [image-optimization.md](ecommerce-c-end/image-optimization.md) | 图片 / Sharp |
| [official-patterns.md](ecommerce-c-end/official-patterns.md) | Content Loader / Hybrid |
| [code-templates.md](ecommerce-c-end/code-templates.md) | 可复制代码 |
| [reference.md](ecommerce-c-end/reference.md) | Store API / Webhook |
| [migration-checklist.md](ecommerce-c-end/migration-checklist.md) | 迁移清单 |
| [testing.md](ecommerce-c-end/testing.md) | 测试 |
| [astro-docs-index.md](ecommerce-c-end/astro-docs-index.md) | Astro 文档索引 |
| [astro-docs-zh-cn-urls.txt](ecommerce-c-end/astro-docs-zh-cn-urls.txt) | 中文文档 URL 列表 |

---

## AI 跨会话记忆 `.claude/memory/`

| 文件 | 用途 |
|------|------|
| [MEMORY.md](../.claude/memory/MEMORY.md) | 索引 |
| [architecture.md](../.claude/memory/architecture.md) | 架构快照 |
| [project-status.md](../.claude/memory/project-status.md) | 状态快照 |
| [user-prefs.md](../.claude/memory/user-prefs.md) | 用户偏好 |

---

## 推荐阅读路径

```text
START_HERE → QUICKSTART → 00-agent-handoff
         → PROJECT_STATUS + REMAINING-WORK
         →（改 API）02 + 09-stitching + 01
         →（改 C 端）ecommerce-c-end/implementation-status → SKILL 导航表
```

---

## 维护约定

| 动作 | 更新 |
|------|------|
| 新 Admin/Store API | PROJECT_STATUS §API 矩阵 |
| 完成/新增待办 | REMAINING-WORK §3 |
| C 端功能 | ecommerce-c-end/implementation-status.md |
| 新增 docs 文件 | **本 README 对应表** |
