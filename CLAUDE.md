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
│   ├── config/         ← 品牌全局配置（BRAND、EMAIL_DOMAIN 等）
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

## 项目规划文档（必读）

在做任何功能开发或评估完成度前，**必须先查 docs/ 目录的规划文档**，不要仅凭代码是否存在判断。

| 文档 | 用途 | 何时看 |
|------|------|--------|
| [docs/14-admin-api-gap-matrix.md](docs/14-admin-api-gap-matrix.md) | **权威缺口表**：Admin ↔ API / client / hooks 对照，P0/P1/P2 优先级，⚠️/🟢 状态标记 | 评估功能完成度 |
| [docs/15-ai-improvement-tasks.md](docs/15-ai-improvement-tasks.md) | **P2 任务 backlog**：TASK-ID、验收命令、Wave 排期、勾选清单 | 找下一个要做的任务 |
| [docs/16-full-completion-playbook.md](docs/16-full-completion-playbook.md) | **收尾手册**：Phase 0–6 状态、DoD 检查清单、完成度估算 | 全局进度判断 |
| [docs/00-agent-handoff.md](docs/00-agent-handoff.md) | **主交接文档**：目标、目录、规则、实现顺序、自检清单 | 了解项目全貌 |
| [docs/12-testing-plan.mdx](docs/12-testing-plan.mdx) | 自动化测试方案：Vitest + Hono Test Client + Playwright E2E | 写测试前 |
| [docs/09-stitching-alignment.mdx](docs/09-stitching-alignment.mdx) | 缝合对齐规则：Dashboard ↔ SDK 适配层 ↔ Hono Server | 做 API 对接 |
| [docs/ecommerce-c-end/full-tech-stack.md](docs/ecommerce-c-end/full-tech-stack.md) | **C 端全栈技术方案**：Astro + Hono 架构、Content Loader、Hybrid 渲染、支付、部署 | 改 C 端前必读 |
| [docs/ecommerce-c-end/adoption-matrix.md](docs/ecommerce-c-end/adoption-matrix.md) | **功能 × Astro 适配矩阵**：三阶段路线、ROI 评级、转化漏斗 | 评估 C 端功能优先级 |
| [docs/ecommerce-c-end/implementation-status.md](docs/ecommerce-c-end/implementation-status.md) | **C 端实现状态**：基础设施/数据层/UI/SEO/部署 各模块 ✅🟡❌ | 了解 C 端完成度 |
| [docs/ecommerce-c-end/storefront-conventions.md](docs/ecommerce-c-end/storefront-conventions.md) | **Storefront 工程约定**：命名、网络调用、状态分层、检查单 | 写 C 端代码时 |
| [docs/ecommerce-c-end/adapter-deployment.md](docs/ecommerce-c-end/adapter-deployment.md) | **部署方案**：Vercel/Docker/CI/Webhook | 部署 C 端时 |

**注意**：`docs/11-feature-tracker.mdx` 已归档，缺口以 14 矩阵为准。15 任务 backlog 的 §3 总览表可能与 §4 详情状态不一致，以 16 playbook 代码核实为准。C 端实现状态以 `docs/ecommerce-c-end/implementation-status.md` 为准。

## 运行命令

```bash
pnpm dev              # 启动 server + admin + storefront
pnpm dev:admin        # 仅 admin (localhost:5173，proxy /api → localhost:9000)
pnpm dev:server       # 仅 server (localhost:9000)
pnpm build:admin      # 构建 admin → apps/server/public/app/
```

## Storefront (Astro) 开发规范

**Storefront 使用 Astro 5 + Hybrid 渲染，架构为「Hono 交易大脑 + Astro 展示壳」。**

### 技术选型

| 领域 | 选型 |
|------|------|
| 数据 | Content Loader ← Hono Store API（build 时同步），pages 禁止各自 fetch |
| 渲染 | `output: "static"`，交易页 `prerender = false` |
| UI 交互 | 原生 `<script>` + HTML5 标签（Preact 仅 checkout 必要时） |
| 状态 | Nano Stores（`$cartCount`、`$cartId`），server cart 为权威 |
| 样式 | Tailwind |
| 认证 | Hono JWT customer，middleware 读 httpOnly cookie |
| 图片 | `astro:assets` Image/Picture，`image.domains` 白名单 |

### 开发规则

1. **安装集成用 `astro add`** — 不手动编辑 `astro.config.mjs` 或 `package.json`
2. **验证当前 API** — Astro sessions/actions 等新特性可能过时，通过 MCP（`.mcp.json`）查最新文档
3. **图片域名白名单** — 外部图片 URL 需在 `astro.config.mjs` 的 `image.domains` 中配置
4. **API 请求** — 通过 `PUBLIC_API_URL` 指向 Hono Server，fetch 带 `/api` 前缀
5. **品牌名称** — 从 `@my-store/config` 导入 `BRAND`，不硬编码
6. **不要用 React 岛** — checkout 复杂块可上 Preact `client:visible`，禁止 React
7. **不动 Hono 认证** — 不换 Clerk/Better Auth/Astro Sessions，保持现有 JWT 方案

### C 端技术方案文档

在做 C 端改动前必读 `docs/ecommerce-c-end/`：

| 先看 | 再看（按需） |
|------|-------------|
| [full-tech-stack.md](docs/ecommerce-c-end/full-tech-stack.md) — 全局架构 | [image-optimization.md](docs/ecommerce-c-end/image-optimization.md) |
| [adoption-matrix.md](docs/ecommerce-c-end/adoption-matrix.md) — 三阶段路线 | [islands-strategy.md](docs/ecommerce-c-end/islands-strategy.md) |
| [implementation-status.md](docs/ecommerce-c-end/implementation-status.md) — 完成度 | [cart-checkout-auth.md](docs/ecommerce-c-end/cart-checkout-auth.md) |
| [storefront-conventions.md](docs/ecommerce-c-end/storefront-conventions.md) — 编码规范 | [seo-and-metadata.md](docs/ecommerce-c-end/seo-and-metadata.md) |
| [adapter-deployment.md](docs/ecommerce-c-end/adapter-deployment.md) — 部署 | [native-html-components.md](docs/ecommerce-c-end/native-html-components.md) |
| | [code-templates.md](docs/ecommerce-c-end/code-templates.md) |

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
