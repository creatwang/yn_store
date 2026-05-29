# CLAUDE.md

## 项目结构

```
my-medusa-store-hono/
├── apps/
│   ├── admin/          ← 实际运行的 Admin 管理界面 (Vite + React, localhost:5173)
│   │   ├── src/        ← 业务代码：routes, components, hooks, providers
│   │   └── demo/       ← @medusajs/dashboard 源码，实现新组件时先到这里找参考
│   │       └── dashboard/src/routes/    ← 所有页面的完整/空壳实现
│   ├── server/         ← Hono API 后端 (localhost:9000)，挂载 /app 静态文件
│   └── storefront/     ← 前端商店
├── packages/
│   ├── db/             ← Drizzle ORM schema
│   └── validators/     ← Zod 验证器
└── scripts/            ← 构建/初始化脚本
```

## 核心原则

**实现任何 UI 组件前，先去 `apps/admin/demo/dashboard/src/routes/` 找对应页面的参考实现。**
demo 目录是 Medusa 官方 dashboard 的源码，包含完整的逻辑和组件。找不到时先说明，再去 Medusa 官方仓库找。

## 开发流程（必须严格遵守）

### Step 1 — 扫描 demo 中所有相关文件
```bash
# 列出要改动的功能相关的所有 demo 文件
find apps/admin/demo/dashboard/src/routes/[feature-path] -type f | sort
```
不止看目标文件本身，还要看同目录下的所有子组件、公共组件、hooks。

### Step 2 — 读 demo 源码
用 Read 工具读每个相关文件，理解：
- 用的什么 UI 组件（ChipInput vs Textarea、IconButton vs Button）
- 用的什么布局模式（Form.Item/Form.Label/Form.Control）
- 用的什么交互模式（SortableList 拖拽、DataGrid 编辑）
- 用的什么数据获取方式（useComboboxData、直接 useQuery）

### Step 3 — COPY，不要手写
**优先直接复制 demo 中的代码到项目对应位置。**
只有 demo 中没有对应实现时才自己写。复制时只改 import 路径。

### Step 4 — 验证清单
- [ ] 页面无 console error
- [ ] 页面无 404 网络请求
- [ ] 样式与 demo 一致
- [ ] 交互行为与 demo 一致（ChipInput 回车添加 chip、拖拽排序等）

关键参考路径：
- 产品编辑表单 → `demo/dashboard/src/routes/products/product-edit/components/edit-product-form/`
- 产品组织 → `demo/dashboard/src/routes/products/product-organization/components/`
- 产品属性 → `demo/dashboard/src/routes/products/product-attributes/components/`
- 产品媒体 → `demo/dashboard/src/routes/products/product-media/components/`
- 销售渠道 → `demo/dashboard/src/routes/products/product-sales-channels/components/`
- 库存套件 → `demo/dashboard/src/routes/products/product-create-variant/components/`
- 公共组件 → `demo/dashboard/src/routes/products/common/components/`

## 运行命令

```bash
pnpm dev              # 启动 server + admin + storefront
pnpm dev:admin        # 仅 admin (localhost:5173，proxy /api → localhost:9000)
pnpm dev:server       # 仅 server (localhost:9000)
pnpm build:admin      # 构建 admin → apps/server/public/app/
```

---

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
