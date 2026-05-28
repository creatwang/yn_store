---
name: code-conventions
description: Hono+Drizzle 全栈代码规范，触发关键词：命名、格式、import、注释、错误处理、代码审查、格式化
---

# 代码规范 — Hono + Drizzle 全栈

## 触发条件

- "检查代码规范" / "review 代码"
- "格式化" / "命名不对" / "import 顺序"
- 新模块开发完成、提交前自查
- 任何 TypeScript 报错（`noUnusedLocals`, `noUnusedParameters`）

---

## 1. 文件命名

| 类型 | 规范 | 示例 |
|------|------|------|
| 路由文件 | `{entity}.ts` 或 `{entity}-{sub}.ts` | `products.ts`, `product-variants.ts` |
| Service 文件 | `{entity}.service.ts` | `product.service.ts`, `variant.service.ts` |
| Middleware | `{purpose}.ts` | `auth.ts`, `error-handler.ts` |
| Schema | `{domain}.ts` | `product.ts`, `inventory.ts` |
| Validator | `{domain}.ts` | `product.ts` |
| 测试 | `{module}.test.ts` | `products.test.ts` |
| 页面 | kebab-case 目录 + `{page}.tsx` | `product-detail/product-detail.tsx` |

---

## 2. 目录结构

```
apps/server/src/
  routes/admin/{entity}.ts      ← 链式路由，export admin{Entities}
  routes/admin/{entity}-{sub}.ts← 子路由
  services/{entity}.service.ts  ← export const {entity}Service
  middleware/{purpose}.ts       ← 中间件
  lib/{utility}.ts              ← 工具函数（jwt, slug, check-db）

apps/admin/src/
  hooks/api/{module}.tsx        ← TanStack Query hooks（拷贝自 Dashboard）
  routes/{module}/              ← UI 页面（拷贝自 Dashboard）
  lib/client.ts                 ← SDK 适配层
  lib/api.ts                    ← Hono RPC 客户端

packages/db/src/
  schema/{domain}.ts            ← Drizzle 表定义
  client.ts                     ← getDb(), setDb()

packages/validators/src/
  {domain}.ts                   ← Zod schemas
```

---

## 3. 命名规范

### 3.1 变量/函数

| 元素 | 规范 | 示例 |
|------|------|------|
| 路由导出 | `admin` + 首字母大写复数 | `export const adminProducts` |
| Service 导出 | camelCase + `Service` | `export const productService` |
| Service 方法 | `list`, `getById`, `create`, `update`, `delete` | 统一命名 |
| Schema 导出 | 小写表名 | `export const product` |
| Zod schema | `{action}{Entity}Schema` | `createProductSchema` |
| ID 前缀 | kebab 单数 | `generateId('prod')` → `prod_xxx` |
| 数据库列 | snake_case | `deleted_at`, `product_id` |

### 3.2 TypeScript 类型

| 元素 | 规范 | 示例 |
|------|------|------|
| 通用类型 | PascalCase | `AuthVariables`, `TokenPayload` |
| 输入类型 | `{Action}{Entity}Input` | `CreateProductInput` |
| Query 类型 | `List{Entities}Query` | `ListProductsQuery` |
| 响应类型 | 从 Hono RPC 自动推断 | 不手写响应类型 |

---

## 4. Import 顺序

```typescript
// 1. 框架核心
import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"

// 2. ORM 工具
import { and, eq, isNull, sql } from "drizzle-orm"

// 3. 内部包（@my-store/*）
import { getDb, product } from "@my-store/db"
import { createProductSchema } from "@my-store/validators"

// 4. 内部模块
import { productService } from "../../services/product.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

// 5. 第三方
import { HTTPException } from "hono/http-exception"
```

**规则**：每组按字母序排列，组间空一行。

---

## 5. 路由规范（Hono 链式）

```typescript
// ✅ 正确：链式定义
export const adminProducts = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", async (c) => { ... })
  .get("/:id", async (c) => { ... })
  .post("/", async (c) => { ... })
  .post("/:id", async (c) => { ... })
  .delete("/:id", async (c) => { ... })

// ❌ 错误：分句挂载
const app = new Hono()
app.get("/products", handler)  // AppType 推断丢失
```

**规则**：
- 路由**必须**链式定义
- 子路由用 `new Hono()` 链式导出，在 `app.ts` 用 `.route()` 挂载
- 路径参数用 `:paramName`，用 `c.req.param("paramName")` 取值
- 所有 admin 路由必须 `.use("*", adminAuth)`

---

## 6. Service 规范

```typescript
// ✅ 标准 Service 结构
export const {module}Service = {
  async list(query) {
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
    const [item] = await db.select().from({table})
      .where(and(eq({table}.id, id), isNull({table}.deleted_at)))
      .limit(1)
    if (!item) throw new HTTPException(404, { message: "{Entity} not found" })
    return { {entity}: item }
  },

  async create(input: any) {
    const db = getDb()
    const id = generateId("{prefix}")
    const [created] = await db.insert({table})
      .values({ id, ...input, created_at: sql`now()`, updated_at: sql`now()` })
      .returning()
    return { {entity}: created }
  },

  async update(id: string, input: any) {
    const db = getDb()
    await this.getById(id) // 先确认存在
    const [updated] = await db.update({table})
      .set({ ...input, updated_at: sql`now()` })
      .where(eq({table}.id, id))
      .returning()
    if (!updated) throw new HTTPException(404, { message: "{Entity} not found" })
    return { {entity}: updated }
  },

  async delete(id: string) {
    const db = getDb()
    await this.getById(id)
    await db.update({table})
      .set({ deleted_at: sql`now()` })
      .where(eq({table}.id, id))
    return { id, object: "{entity}", deleted: true }
  },
}
```

**规则**：
- 所有查询带 `deleted_at IS NULL`（软删过滤）
- 删除用软删（`deleted_at = sql\`now()\``），不物理删除
- 返回格式统一：`{ {entity}: data }` 或 `{ {entities}: data, count, limit, offset }`
- 不存在时抛 `HTTPException(404)`
- 金额字段用 `amount` + `raw_amount` 双列（如有）
- 时间用 `sql\`now()\``

---

## 7. 跨模块数据查询

```typescript
// ❌ 禁止：在 Service 层手写跨模块 JOIN
async getById(id) {
  // 不能在这里写 SELECT ... FROM product p
  //   JOIN inventory_item ii ON ...
  //   JOIN inventory_level il ON ...
}

// ✅ 正确：middleware 后处理模式
// 1. Service 只查本模块
async listVariants(productId) {
  const variants = await db.select().from(productVariant).where(...)
  return { variants }  // 干净数据，无跨模块字段
}

// 2. 需要跨模块数据时，独立调用
async getInventoryQuantity(variantIds: string[]) {
  // 只算必要数据，返回 { variant_id: number }
}
```

**规则**：
- Service 不跨越模块边界
- 跨模块数据用独立 middleware / helper 函数
- 只返回聚合计算结果，不返回完整关联对象

---

## 8. RAW SQL 使用规范

```typescript
// ✅ 允许：有 Drizzle schema 的表用 query builder
const [item] = await db.select().from(product).where(eq(product.id, id))

// ✅ 允许：无 Drizzle schema 的中间表用 sql 模板，必须标注原因
// raw SQL: product_tags 表无 Drizzle schema 映射
const tags = await db.execute(sql`
  SELECT pt.id, pt.value FROM product_tag pt
  JOIN product_tags pts ON pts.product_tag_id = pt.id
  WHERE pts.product_id = ${id}
`)

// ✅ 数组参数正确写法
sql`WHERE id = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}`), sql`, `)}])`

// ❌ 数组参数错误写法
sql`WHERE id = ANY(${ids})`

// ❌ 禁止：手写字符串拼接 SQL
db.execute(`SELECT * FROM ${table} WHERE id = '${id}'`)
```

---

## 9. 错误处理

```typescript
// ✅ 业务错误用 HTTPException
throw new HTTPException(404, { message: "Product not found" })
throw new HTTPException(401, { message: "Unauthorized" })
throw new HTTPException(400, { message: "Validation failed" })

// ✅ 响应中带 message 字段（前端 parseJsonResponse 会读取）
return c.json({ message: "...", type: "..." }, 500)

// ✅ Controller 不需要 try-catch（errorHandler 统一处理）
.get("/:id", async (c) => {
  const result = await productService.getById(c.req.param("id")) // 404 自动抛
  return c.json(result)
})
```

---

## 10. SDK 适配（client.ts）

```typescript
// ✅ 只做路径翻译，不写业务逻辑
retrieve: (id, query) => rpcGet(rpc[":id"], { id }, query),

// ❌ 禁止在适配层处理数据
retrieve: (id, query) => {
  const data = await ...
  data.product.variants = data.product.variants.map(enrich) // 不该在这里
  return data
}

// ✅ noop 用于后端未实现的方法
batchVariantInventoryItems: noop,   // 等后端实现

// ✅ 动态参数用 Any 绕过类型检查（TypeScript 严格但路径动态）
const res = await (api as any).auth[actor][method].$post({ json: payload })
```

---

## 11. 注释规范

```typescript
// ✅ 对齐注释：标注参考源
// 对齐 Medusa 官方 defaultAdminProductFields
// 对齐 @medusajs/js-sdk v2.15.3 product.js

// ✅ RAW SQL 注释：标注原因
// raw SQL: product_variant_inventory_item 表无 Drizzle schema 映射

// ✅ TODO 注释
// TODO: 等后端实现 POST /admin/products/:id/variants/batch 后替换

// ✅ JSDoc 用于公开 API
/** 跨模块 Middleware：只算 inventory_quantity 数字 */
async function getVariantsInventoryQuantity(...) { }

// ❌ 禁止无意义注释
// 查询数据库
// 返回结果
```

---

## 12. TSconfig 约束

本项目 `tsconfig.json` 开启了严格模式：

```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

**后果**：
- 未使用的参数用 `_` 前缀：`(_query?: any)`
- 未使用的变量用 `_` 前缀：`const _unused = ...`
- 所有路径别名通过 `paths` 配置：`@/*` → `./src/*`

**提交前必跑**：
```bash
npx tsc --noEmit --skipLibCheck
```

---

## 13. 自查清单

```
[ ] 路由链式定义
[ ] 所有查询带 deleted_at IS NULL
[ ] Service 方法名统一（list/getById/create/update/delete）
[ ] 返回格式统一（{ entity: data }）
[ ] 无跨模块手写 JOIN
[ ] Import 顺序正确
[ ] 注释标注了参考源 / raw SQL 原因
[ ] tsc --noEmit 通过
[ ] 测试通过（pnpm test）
[ ] 未使用变量用 _ 前缀
```
