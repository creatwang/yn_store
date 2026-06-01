# 测试策略

> 官方：https://docs.astro.build/zh-cn/guides/testing/  
> 现状：storefront **无测试**；server 有 Vitest

---

## 1. 金字塔

| 层级 | 工具 | 范围 | 优先级 |
|------|------|------|--------|
| E2E | Playwright | 首页→加购→cart→checkout | **P0** |
| Loader 单测 | Vitest | mock fetch → store 条数 | P1 |
| 组件 | Vitest + Astro Container | 静态 astro 输出 | P2 |
| Lighthouse CI | unlighthouse / CLI | LCP/CLS/SEO 回归 | P2 |

---

## 2. Playwright 转化漏斗（推荐首写）

```typescript
// apps/storefront/e2e/checkout.spec.ts
import { test, expect } from "@playwright/test"

test("browse and add to cart", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("link", { name: /T-Shirt/i }).click()
  await page.getByRole("button", { name: "加入购物车" }).click()
  await expect(page.getByText("已加入购物车")).toBeVisible()
  await page.goto("/cart")
  await expect(page.getByText(/Medusa T-Shirt/i)).toBeVisible()
})
```

**前置**：`pnpm dev` server + storefront，或 CI 起 docker compose。

---

## 3. Loader 单测

```typescript
import { describe, it, expect, vi } from "vitest"

describe("honoStoreLoader", () => {
  it("maps products to store", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ products: [{ id: "1", handle: "a", title: "A" }] }),
    }))
    // invoke loader.load({ store, logger })
  })
})
```

---

## 4. 图片 / CWV 断言

Build 后检查：

- PDP HTML 含 `<picture>` + avif source
- 列表 img 含 `width` `height` `srcset`
- 无 `react` / `preact` chunk（非 checkout 页）

可选 Lighthouse CI gate：Performance ≥ 90，CLS < 0.1。

---

## 5. CI 草图

```yaml
jobs:
  storefront:
    steps:
      - run: pnpm install
      - run: pnpm build --filter=@my-store/storefront
        env:
          PUBLIC_API_URL: ${{ secrets.STAGING_API_URL }}
      - run: pnpm exec playwright test
        working-directory: apps/storefront
```

---

## 6. 不测什么

- 不 mock 整个 Medusa；E2E 打真实 staging API
- 不为 trivial getter 写单测
- UI 岛不引入 React Testing Library

---

## 7. 相关

- migration Phase 6：[migration-checklist.md](migration-checklist.md)
- 官方 patterns §6：[official-patterns.md](official-patterns.md) §6
