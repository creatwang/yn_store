---
name: module-scaffold
description: 给定模块名 + Medusa 官方 API 路径，自动生成全部 5 层代码（Route/Service/Schema/Validator/SDK 适配）
---

# Module Scaffold — 一键生成新模块骨架

## 触发条件

- "新建 {模块名} API"
- "创建 {entity} CRUD"
- "给 {模块} 加后端"
- 参照 `docs/11-feature-tracker.mdx` 中任意 ❌ 项

## 工作流程

### Step 1: 理解需求
```markdown
从 `docs/11-feature-tracker.mdx` 找到目标模块的功能 ID
例如: "实现 COL-01 ~ COL-06 合集模块完整 CRUD"
```

### Step 2: 查 Medusa 官方源码
```bash
# 查响应字段
cat apps/admin/demo/backend/node_modules/@medusajs/medusa/dist/api/admin/{module}/query-config.js

# 查处理逻辑
cat apps/admin/demo/backend/node_modules/@medusajs/medusa/dist/api/admin/{module}/route.js

# 查 SDK 方法签名
cat apps/admin/demo/dashboard/node_modules/@medusajs/js-sdk/dist/admin/{module}.js
```

### Step 3: 生成代码（5 层）

**层级 1 — DB Schema**（`packages/db/src/schema/{module}.ts`）
- 仅当表未定义时创建
- 从 Medusa migration 或 DB `\d` 确认字段

**层级 2 — Validator**（`packages/validators/src/{module}.ts`）
```typescript
import { z } from "zod"

export const create{Entity}Schema = z.object({
  // 字段对齐 Medusa official validators.js
})

export const update{Entity}Schema = create{Entity}Schema.partial()

export const list{Entities}Query = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  q: z.string().optional(),
})
```

**层级 3 — Service**（`apps/server/src/services/{module}.service.ts`）
```typescript
import { and, count, eq, isNull, sql } from "drizzle-orm"
import { generateId, getDb, {table} } from "@my-store/db"
import { HTTPException } from "hono/http-exception"

export const {module}Service = {
  async list(query: any) {
    const db = getDb()
    const where = and(isNull({table}.deleted_at))
    const [rows, [{ total }]] = await Promise.all([
      db.select().from({table}).where(where).limit(query.limit).offset(query.offset),
      db.select({ total: count() }).from({table}).where(where),
    ])
    return { {entities}: rows, count: Number(total), limit: query.limit, offset: query.offset }
  },

  async getById(id: string) {
    const db = getDb()
    const [item] = await db.select().from({table}).where(eq({table}.id, id)).limit(1)
    if (!item) throw new HTTPException(404, { message: "{Entity} not found" })
    return { {entity}: item }
  },

  async create(input: any) {
    const db = getDb()
    const id = generateId("{prefix}")
    const [created] = await db.insert({table}).values({ id, ...input, created_at: sql`now()`, updated_at: sql`now()` }).returning()
    return { {entity}: created }
  },

  async update(id: string, input: any) {
    const db = getDb()
    const { {entity}: existing } = await this.getById(id)
    const [updated] = await db.update({table}).set({ ...input, updated_at: sql`now()` }).where(eq({table}.id, id)).returning()
    if (!updated) throw new HTTPException(404, { message: "{Entity} not found" })
    return { {entity}: updated }
  },

  async delete(id: string) {
    const db = getDb()
    await this.getById(id)
    await db.update({table}).set({ deleted_at: sql`now()` }).where(eq({table}.id, id))
    return { id, object: "{entity}", deleted: true }
  },
}
```

**层级 4 — Route**（`apps/server/src/routes/admin/{module}.ts`）
```typescript
import { Hono } from "hono"
import { {module}Service } from "../../services/{module}.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const admin{Modules} = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => {
    const limit = Number(c.req.query("limit") || 50)
    const offset = Number(c.req.query("offset") || 0)
    const result = await {module}Service.list({ limit, offset })
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await {module}Service.getById(c.req.param("id"))
    return c.json(result)
  })
  .post("/", async (c) => {
    const body = await c.req.json()
    const result = await {module}Service.create(body)
    return c.json(result, 201)
  })
  .post("/:id", async (c) => {
    const body = await c.req.json()
    const result = await {module}Service.update(c.req.param("id"), body)
    return c.json(result)
  })
  .delete("/:id", async (c) => {
    const result = await {module}Service.delete(c.req.param("id"))
    return c.json(result)
  })
```

**层级 5 — App.ts 挂载 + SDK 适配**

App.ts 挂载：
```typescript
// apps/server/src/app.ts
import { admin{Modules} } from "./routes/admin/{module}"
// 在 apiRoutes 中加:
.route("/admin/{entity}", admin{Modules})
```

SDK 适配（`apps/admin/src/lib/client.ts`）：
```typescript
// 在 admin 对象中加：
{module}: entityClient("{entity}"),
```

### Step 4: 更新功能追踪
```markdown
更新 docs/11-feature-tracker.mdx 中对应 ID 的状态为 ✅
```

### Step 5: 类型检查
```bash
npx tsc --noEmit --skipLibCheck
```

## 变量替换表

| 占位符 | 含义 | 示例 (collection) |
|--------|------|-----------|
| `{module}` | 模块名 | collection |
| `{Modules}` | 首字母大写复数 | Collections |
| `{Module}` | 首字母大写单数 | Collection |
| `{entity}` | 实体名 | collection |
| `{entities}` | 实体复数 | collections |
| `{Entity}` | 实体首字母大写 | Collection |
| `{table}` | Drizzle schema 变量名 | productCollection |
| `{prefix}` | generateId 前缀 | pcol |

## 注意事项

- 响应形状**必须**对齐 Medusa 官方 `query-config.js` 的 `default*Fields`
- 路径与 Medusa 官方一致（如 `/admin/collections`，不是 `/admin/product-collections`）
- 交叉模块数据不在 Service 层查，用 middleware 后处理
- 所有查询带 `deleted_at IS NULL`
