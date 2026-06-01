# UI 岛技术栈规范（原生优先 · Preact 兜底）

> 适用：`my-medusa-store-hono/apps/storefront` · 目标站如 yanan.store  
> 原则：**最快加载（0 框架运行时）+ 最快开发（能写 `.astro` 就不写 `.jsx`）**

---

## 1. 选用优先级（团队强制）

| 优先级 | 方案 | 运行时体积 | 何时用 |
|--------|------|------------|--------|
| **🥇 首选** | **语义 HTML 原生标签**（`<output>` / `<fieldset>` 等） | **0 KB** | 价格、表单分组、时间、联系信息 → 见 [native-html-components.md](native-html-components.md) |
| **🥇 首选** | Astro 原生 HTML + `<script>` 标准岛 | **0 KB** UI 框架 | 加购、Tab、筛选、抽屉、表单提交 |
| **🥈 零 JS** | HTML5 `<dialog>` / `<details>` | **0 KB** | 弹窗、FAQ、参数折叠 |
| **🥉 兜底** | **Preact** 岛（`client:visible`） | ~3 KB | 仅 checkout 等极复杂受控表单 |
| **🚫 禁止** | React 岛（`@astrojs/react`） | ~40 KB+ | **全面禁止**，严重拉低 LCP |

**口诀**：能 `<script>` 就不 Preact；能 `<dialog>` 就不 `<script>`；Preact 必须 `client:visible`，且**只在需要的页面引用组件**。

---

## 2. 方案一：原生 `<script>` 标准岛（默认）

### 2.1 机制

- `.astro` 内 `<script>` 由 Astro **打包、压缩、按需异步加载**
- 可 `import` 同目录 TS、`nanostores`、`lib/cart.ts`
- 配合 **Nano Stores** 跨组件通信（无需 React/Vue）

### 2.2 适用

- 加入购物车、Header 角标更新  
- Tab / 静态列表筛选  
- 移动端侧边导航  
- 登录/注册表单（简单）  
- 购物车列表增删（现有 `cart.astro` 模式）

### 2.3 模板：MiniCart.astro

```astro
---
// src/components/product/MiniCart.astro
interface Props {
  productId: string
  variantId?: string
  price: number
}
const { productId, variantId, price } = Astro.props
---

<div class="cart-box flex items-center gap-3">
  <output id="price-tag" for="variant-select" class="text-lg font-semibold">
    ${price.toFixed(2)}
  </output>
  <button
    type="button"
    id="add-btn"
    class="rounded bg-gray-900 px-4 py-2 text-white"
    data-product-id={productId}
    data-variant-id={variantId ?? ""}
  >
    加入购物车
  </button>
</div>

<script>
  import { incrementCart } from "../stores/cartStore"
  import { apiFetch, getCartId, setCartId } from "../lib/cart"

  const button = document.getElementById("add-btn") as HTMLButtonElement | null
  button?.addEventListener("click", async () => {
    incrementCart()
    const productId = button.dataset.productId!
    const variantId = button.dataset.variantId || undefined
    try {
      let cartId = getCartId()
      if (!cartId) {
        const res = await apiFetch("/store/carts", {
          method: "POST",
          body: JSON.stringify({}),
        })
        const { cart } = await res.json()
        cartId = cart.id
        setCartId(cartId)
      }
      await apiFetch(`/store/carts/${cartId}/line-items`, {
        method: "POST",
        body: JSON.stringify({ variant_id: variantId, quantity: 1 }),
      })
    } catch {
      import("../stores/cartStore").then(({ decrementCart }) => decrementCart())
    }
  })
</script>
```

### 2.4 Header 角标（纯 script，无 Preact）

```astro
---
// src/components/cart/CartBadge.astro
---

<a href="/cart" class="relative">
  购物车
  <span
    id="cart-badge"
    class="hidden absolute -right-2 -top-2 rounded-full bg-red-500 px-1.5 text-xs text-white"
  >0</span>
</a>

<script>
  import { $cartCount } from "../stores/cartStore"

  const el = document.getElementById("cart-badge")
  $cartCount.subscribe((n) => {
    if (!el) return
    el.textContent = String(n)
    el.classList.toggle("hidden", n <= 0)
  })
</script>
```

在 `BaseLayout.astro` 直接 `<CartBadge />`，**无需** `client:*`。

---

## 3. 方案二：HTML5 零 JS

| 场景 | 标签 | 说明 |
|------|------|------|
| 确认弹窗 / 快速预览 | `<dialog>` + `.showModal()` | 原生 a11y，CSS 动画 |
| 商品参数 / FAQ | `<details>` + `<summary>` | 零 JS 折叠 |
| 移动端菜单（简单） | `<details>` 或 checkbox hack | 优先于 JS 抽屉 |

```astro
<details class="rounded border p-4">
  <summary class="cursor-pointer font-medium">规格参数</summary>
  <dl class="mt-2 text-sm text-gray-600">...</dl>
</details>

<dialog id="promo-dialog" class="rounded-lg p-6 backdrop:bg-black/50">
  <p>促销说明</p>
  <form method="dialog"><button>关闭</button></form>
</dialog>
```

复杂购物车抽屉若需动画，仍优先 `<dialog>` + 少量 script，而非 Preact。

---

## 4. 方案三：Preact（仅复杂页 · 按需加载）

### 4.1 何时才允许

- 结账页：多段受控表单 + 实时优惠联动 + 支付 widget 同屏  
- 其他页面 **默认不允许** Preact 组件

### 4.2 安装（一次性）

```bash
npx astro add preact
# 勿 astro add react
```

### 4.3 消费规则

```astro
---
import ComplexCheckout from "../components/ComplexCheckout.tsx"
export const prerender = false
---

<!-- 必须 client:visible：不进视口不下载 Preact -->
<ComplexCheckout client:visible />
```

| 指令 | 允许场景 |
|------|----------|
| `client:visible` | Preact 默认唯一指令 |
| `client:load` | **禁止**用于 Preact（除非支付 SDK 强制，需 PR 说明） |
| `client:only` | Stripe 等必须浏览器 API 的支付 widget |

### 4.4 Preact 与 Nano Stores

Preact 页内仍用 `@nanostores/preact` 的 `useStore`，与原生 script 岛**共享同一 store 文件**。

```bash
pnpm add nanostores @nanostores/preact --filter=@my-store/storefront
# 不要 @nanostores/react
```

---

## 5. Nano Stores（跨岛通信，与 UI 栈无关）

```
src/stores/cartStore.ts   ← atom/map，框架无关
     ↑              ↑
原生 <script>    Preact useStore（仅 checkout）
```

官方依据：[sharing-state-islands](https://docs.astro.build/zh-cn/recipes/sharing-state-islands/)

---

## 6. 页面 × 技术对照（yanan.store / 本项目）

| 页面 | UI 方案 | Preact |
|------|---------|--------|
| 首页 / 列表 / 集合 | 纯 Astro + Image | ❌ |
| 商品详情 | Astro + `<script>` 加购 + 注水 | ❌ |
| 购物车 | Astro SSR + `<script>` | ❌ |
| 登录 / 注册 | Astro + `<script>` 或 form POST | ❌ |
| 账户 / 订单 | Astro SSR + `<script>` | ❌ |
| **结算 checkout** | Astro 外壳 + `<script>` 多步 | ⚠️ 仅复杂块用 Preact `visible` |
| 支付 Stripe | `<script>` 动态 import 或 Preact `client:only` | 视 SDK |

---

## 7. 与现有 MVP 的关系

| 现状 | 目标 |
|------|------|
| `checkout.astro` 大段内联 script | ✅ **保留方向**，拆成组件化 `.astro` |
| 计划用 React AddToCartButton | ❌ 改为 `MiniCart.astro` |
| `@astrojs/react` in package.json | 🔄 移除，按需 `@astrojs/preact` |
| `@nanostores/react` | 🔄 改为纯 nanostores + 可选 `@nanostores/preact` |

---

## 8. 禁止清单

- ❌ 为加购/角标/Tab 新建 `.tsx` React/Preact 岛  
- ❌ `Layout` 包裹 `client:load` 根组件  
- ❌ 列表页 `ProductCard.tsx client:load`  
- ❌ 全站 `astro add react`  
- ❌ Preact 组件默认 `client:load`（非 checkout 页）  

---

## 9. 验收

- [ ] 首页/详情 **Network 无 react/react-dom chunk**  
- [ ] PDP 价格使用 **`<output>`** 且 SKU 切换可更新（见 native-html-components.md）  
- [ ] 加购后 Header 角标更新（原生 script + nanostores）  
- [ ] Lighthouse：**TBT 低、JS 体积小**  
- [ ] checkout 以外页面 **无 preact chunk**（或仅 shared 极小）  
