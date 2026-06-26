# 文档索引

> **核实日期**：2026-05-30

---

## 权威（改代码必维护）

| 文档 | 用途 |
|------|------|
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | 完成度、API 挂载、测试 |
| [REMAINING-WORK.md](./REMAINING-WORK.md) | 待办 P0–P3 |
| [API-IMPLEMENTATION-GAP.md](./API-IMPLEMENTATION-GAP.md) | 与 Medusa 官方 API 差异 |
| [00-agent-handoff.md](./00-agent-handoff.md) | 硬规则、命令、开发顺序 |
| [QUICKSTART.md](./QUICKSTART.md) | 快速启动 |

---

## C 端 Storefront

| 文档 | 用途 |
|------|------|
| [ecommerce-c-end/storefront-configuration.md](./ecommerce-c-end/storefront-configuration.md) | **运营向：语言/货币/地区与 C 端联调** |
| [ecommerce-c-end/implementation-status.md](./ecommerce-c-end/implementation-status.md) | C 端完成度 |
| [ecommerce-c-end/storefront-conventions.md](./ecommerce-c-end/storefront-conventions.md) | 目录、命名、禁止项 |
| [ecommerce-c-end/adapter-deployment.md](./ecommerce-c-end/adapter-deployment.md) | Vercel / Docker / CI |

---

## 专题

| 文档 | 用途 |
|------|------|
| [workflow-plan.md](./workflow-plan.md) | Workflow / 事务 / rollback |
| [ADMIN-USER-GUIDE.md](./ADMIN-USER-GUIDE.md) | Admin 运营说明 |
| [DB-POOL-CONCURRENCY.md](./DB-POOL-CONCURRENCY.md) | 连接池与并发 |

---

## Medusa 对照（设计参考，非完成度依据）

| 文档 | 用途 |
|------|------|
| [01-database-schema.mdx](./01-database-schema.mdx) | 表结构 |
| [02-api-endpoints.mdx](./02-api-endpoints.mdx) | 官方 REST 路由 |
| [03-business-workflows.mdx](./03-business-workflows.mdx) | 业务流程 |
| [06-drizzle-migration-guide.mdx](./06-drizzle-migration-guide.mdx) | Drizzle 写法 |
| [08-target-architecture.mdx](./08-target-architecture.mdx) | Admin `/app` + `/api` 部署 |
| [09-stitching-alignment.mdx](./09-stitching-alignment.mdx) | **改 Admin 必读** |

---

## 根目录入口

| 文档 | 用途 |
|------|------|
| [../START_HERE.md](../START_HERE.md) | 开工第一步 |
| [../README.zh-CN.md](../README.zh-CN.md) | 中文说明 |
| [../AGENTS.md](../AGENTS.md) | AI 规则摘要 |

---

## 阅读路径

```text
START_HERE → QUICKSTART → PROJECT_STATUS + REMAINING-WORK
         →（改 API）02 + 09-stitching
         →（改 C 端）ecommerce-c-end/storefront-configuration（运营配置）
         →（改 C 端代码）ecommerce-c-end/implementation-status
```
