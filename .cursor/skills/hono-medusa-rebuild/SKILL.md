---
name: hono-medusa-rebuild
description: 在 my-medusa-store 中用 Hono+Drizzle 重写 Medusa 能力、Vite Admin（方案 A）、Astro 商城；参照 docs/09-11 开发。
---

# Hono + Medusa 表 全栈重建

## 何时触发

- 新功能 / 新 API / Bug 修复 / 重构
- 关键词：product, order, customer, admin, API, route, service, Drizzle, Hono, RPC, SDK, variant, inventory

## 必读文档（按优先级）

| # | 文档 | 作用 |
|---|------|------|
| 1 | `docs/00-agent-handoff.md` | 项目总览、规则、命令 |
| 2 | `docs/11-feature-tracker.mdx` | **功能点全量追踪** — 查实现状态 |
| 3 | `docs/09-stitching-alignment.mdx` | **缝合规则** — 如何对照 Medusa 官方 |
| 4 | `docs/10-refactoring-plan.mdx` | **重构步骤** — 模板、Checklist |
| 5 | `docs/07-feature-spec.mdx` | 功能规格 + 方案 A |

## 辅助 Skills

| Skill | 文件 | 触发场景 |
|-------|------|---------|
| **module-scaffold** | `.cursor/skills/module-scaffold/SKILL.md` | 新建模块 API、创建 CRUD |
| **code-conventions** | `.cursor/skills/code-conventions/SKILL.md` | 命名规范、代码审查、格式检查 |
| 6 | `docs/01-database-schema.mdx` | 表结构 |
| 7 | `docs/02-api-endpoints.mdx` | API 路径对照 |

## 开发流程（关键！）

```
实现任何功能前，按此流程执行：

1. 查 docs/11-feature-tracker.mdx → 确认功能 ID 和当前状态
2. 查 Medusa 官方源码（三端对照）:
   a. @medusajs/medusa/dist/api/admin/{module}/query-config.js → 响应字段
   b. @medusajs/medusa/dist/api/admin/{module}/route.js → 处理逻辑
   c. @medusajs/js-sdk/dist/admin/{module}.js → SDK 方法签名
3. 查 docs/09-stitching-alignment.mdx → 对齐规则
4. 按 docs/10-refactoring-plan.mdx Checklist → 逐层实现
5. 更新 docs/11-feature-tracker.mdx → 标记完成
```

## 金科玉律

- **永远不要凭感觉写 SQL** → 先查 Medusa 官方怎么做
- **链式路由** → `new Hono().get().post().delete().route()`
- **deleted_at IS NULL** → 所有查询必须
- **跨模块不 JOIN** → middleware 后处理模式
- **RAW SQL 标注** → `// raw SQL: product_tags 表无 Drizzle schema 映射`
- **数组参数** → `ANY(ARRAY[${sql.join(...)}])`，永不 `ANY(${jsArray})`
- **Admin 不用 @medusajs/js-sdk** → 用 apps/admin/src/lib/client.ts
- **不修改 apps/backend/** → 只读参考

## 关键路径

| 层 | 路径 |
|----|------|
| API 挂载 | `apps/server/src/app.ts` |
| 路由 | `apps/server/src/routes/admin/{module}.ts` |
| 业务 | `apps/server/src/services/{module}.service.ts` |
| Zod | `packages/validators/src/` |
| Drizzle | `packages/db/src/schema/` |
| SDK 适配 | `apps/admin/src/lib/client.ts` |
| Admin Hooks | `apps/admin/src/hooks/api/` |
| Admin 页面 | `apps/admin/src/routes/{module}/` |

## 代码模板

### Route（Hono 链式）
```typescript
import { Hono } from "hono"
import { {module}Service } from "../../services/{module}.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const admin{Modules} = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => { /* list */ })
  .get("/:id", async (c) => { /* retrieve */ })
  .post("/", async (c) => { /* create */ })
  .post("/:id", async (c) => { /* update */ })
  .delete("/:id", async (c) => { /* delete */ })
```

### Service（统一签名）
```typescript
export const {module}Service = {
  async list(query) { return { {entities}: rows, count, limit, offset } },
  async getById(id) { return { {entity}: item } },
  async create(input) { return { {entity}: created } },
  async update(id, input) { return { {entity}: updated } },
  async delete(id) { return { id, object: "{entity}", deleted: true } },
}
```

### SDK（client.ts 新增条目）
```typescript
{module}: entityClient("{entity}"),  // 基础 CRUD
// 或带子路由的用对应工厂函数
```

## 命令速查

```bash
pnpm dev --filter=@my-store/server    # :9000
pnpm dev --filter=@my-store/admin      # :5173
pnpm dev --filter=@my-store/storefront  # :4321
pnpm run copy:dashboard-ui             # 拷贝 Dashboard UI
npx tsc --noEmit --skipLibCheck        # 类型检查
```
