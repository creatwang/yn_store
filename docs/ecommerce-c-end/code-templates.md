# 可复制代码模板（Hono Store API 版）

> 路径均相对于 `my-medusa-store-hono/apps/storefront/`  
> UI 栈：原生 `<script>` 优先，见 [islands-strategy.md](islands-strategy.md)  
> 依赖：`nanostores`（`@nanostores/preact` 仅 checkout 需要 Preact 时）

---

## §Loader — hono-store-loader.ts

```typescript
// src/loaders/hono-store-loader.ts
import type { Loader } from "astro/loaders"

const API = import.meta.env.PUBLIC_API_URL || "http://localhost:7000"

type RawProduct = {
  id: string
  handle: string
  title: string
  subtitle?: string | null
  description?: string | null
  thumbnail?: string | null
  price?: number | null
  variants?: Array<{
    id: string
    inventory_quantity?: number
    price?: { amount: number; currency_code: string }
  }>
}

async function fetchAllProducts(): Promise<RawProduct[]> {
  const limit = 100
  let offset = 0
  const all: RawProduct[] = []

  for (;;) {
    const res = await fetch(
      `${API}/api/store/products?limit=${limit}&offset=${offset}`,
    )
    if (!res.ok) throw new Error(`Store API ${res.status}`)
    const body = await res.json()
    const batch: RawProduct[] = body.products ?? []
    all.push(...batch)
    if (batch.length < limit) break
    offset += limit
  }
  return all
}

function mapProduct(p: RawProduct) {
  const v = p.variants?.[0]
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    subtitle: p.subtitle ?? "",
    description: p.description ?? "",
    coverImage: p.thumbnail ?? "",
    images: p.thumbnail ? [p.thumbnail] : [],
    price: p.price ?? v?.price?.amount ?? 0,
    stock: v?.inventory_quantity ?? 0,
    category: "",
    attributes: {} as Record<string, string>,
  }
}

export function honoStoreLoader(): Loader {
  return {
    name: "hono-store-products",
    load: async ({ store, logger }) => {
      logger.info("Syncing products from Hono Store API...")
      store.clear()
      const products = await fetchAllProducts()
      for (const raw of products) {
        const data = mapProduct(raw)
        store.set({ id: raw.handle, data })
      }
      logger.info(`Synced ${products.length} products`)
    },
  }
}
```

---

## §Loader — content.config.ts

```typescript
// src/content.config.ts
import { defineCollection, z } from "astro:content"
import { honoStoreLoader } from "./loaders/hono-store-loader"

const productSchema = z.object({
  id: z.string(),
  handle: z.string(),
  title: z.string(),
  subtitle: z.string(),
  description: z.string(),
  coverImage: z.string().url().or(z.literal("")),
  images: z.array(z.string()),
  price: z.number(),
  stock: z.number(),
  category: z.string(),
  attributes: z.record(z.string()).optional(),
})

export const collections = {
  products: defineCollection({
    loader: honoStoreLoader(),
    schema: productSchema,
  }),
}
```

---

## §Image — ProductCardImage.astro

```astro
---
// src/components/product/ProductCardImage.astro
import { Image } from "astro:assets"

interface Props {
  src: string
  alt: string
}

const { src, alt } = Astro.props
const safeSrc = src || "/images/product-placeholder.png"
---

<Image
  src={safeSrc}
  alt={alt}
  width={400}
  height={400}
  layout="constrained"
  loading="lazy"
  decoding="async"
  class="aspect-square w-full object-cover"
/>
```

**astro.config.mjs 必加**：

```javascript
image: {
  domains: ["your-medusa-cdn.example.com"],
  remotePatterns: [{ protocol: "https" }],
  layout: "constrained",
},
```

---

## §PDP — products/[handle].astro

```astro
---
// src/pages/products/[handle].astro
import { getCollection, getEntry } from "astro:content"
import { Picture } from "astro:assets"
import BaseLayout from "../../layouts/BaseLayout.astro"
import ProductAddToCart from "../../components/product/ProductAddToCart.astro"

export async function getStaticPaths() {
  const products = await getCollection("products")
  return products.map((entry) => ({
    params: { handle: entry.id },
    props: { entry },
  }))
}

const { entry } = Astro.props
const { data: product } = entry
const apiUrl = import.meta.env.PUBLIC_API_URL || "http://localhost:7000"
---

<BaseLayout title={product.title} description={product.description}>
  <article class="grid gap-8 md:grid-cols-2">
    {product.coverImage && (
      <Picture
        src={product.coverImage}
        formats={["avif", "webp"]}
        alt={product.title}
        width={800}
        height={800}
        layout="constrained"
        loading="eager"
        fetchpriority="high"
        class="rounded-lg object-cover"
      />
    )}
    <div>
      <h1 class="text-3xl font-bold">{product.title}</h1>
      <p class="mt-4">
        <output id="variant-price" for="variant-select" class="text-2xl font-semibold">
          ${product.price.toFixed(2)}
        </output>
        <span id="js-live-stock" class="ml-2 text-sm text-gray-500"></span>
      </p>
      <ProductAddToCart productId={product.id} variants={variantOptions} />
    </div>
  </article>

  <script is:inline define:vars={{ handle: product.handle, basePrice: product.price, apiUrl }}>
    const priceEl = document.getElementById("js-live-price")
    const stockEl = document.getElementById("js-live-stock")
    if (priceEl) priceEl.textContent = `$${Number(basePrice).toFixed(2)}`

    fetch(`${apiUrl}/api/store/products/${handle}`)
      .then((r) => r.ok ? r.json() : null)
      .then((body) => {
        if (!body?.product) return
        const v = body.product.variants?.[0]
        const live = v?.price?.amount ?? body.product.price
        const stock = v?.inventory_quantity ?? 0
        if (live != null && priceEl) priceEl.textContent = `$${Number(live).toFixed(2)}`
        if (stockEl) stockEl.textContent = stock > 0 ? "有现货" : "已售罄"
      })
      .catch(() => {})
  </script>
</BaseLayout>
```

---

## §NanoStores — src/stores/cartStore.ts

```typescript
import { atom } from "nanostores"

export const $cartCount = atom<number>(0)
export const $cartId = atom<string | null>(null)

const CART_KEY = "storefront_cart_id"

export function initCartFromStorage() {
  if (typeof localStorage === "undefined") return
  $cartId.set(localStorage.getItem(CART_KEY))
}

export function getCartId(): string | null {
  if (typeof localStorage === "undefined") return $cartId.get()
  return localStorage.getItem(CART_KEY) ?? $cartId.get()
}

export function setCartId(id: string) {
  localStorage.setItem(CART_KEY, id)
  $cartId.set(id)
}

export function incrementCart(by = 1) {
  $cartCount.set($cartCount.get() + by)
}

export function decrementCart(by = 1) {
  $cartCount.set(Math.max(0, $cartCount.get() - by))
}
```

---

## §ProductAddToCart — 加购（已实现，首选）

```astro
---
// src/components/product/ProductAddToCart.astro
export interface VariantOption {
  id: string
  title?: string | null
  sku?: string | null
  priceAmount?: number | null
}

interface Props {
  productId: string
  variants: VariantOption[]
}
---

<form id="add-to-cart-form" class="mt-8 space-y-4">
  <p class="text-2xl font-bold">
    $<output id="variant-price" name="price" for="variant-select">
      {initialPrice}
    </output>
  </p>
  <fieldset class="rounded-lg border p-4">
    <legend class="text-sm font-medium">购买选项</legend>
    <select id="variant-select" name="variant">...</select>
    <input id="qty-input" name="quantity" type="number" min="1" enterkeyhint="done" />
  </fieldset>
  <button type="button" id="add-to-cart">加入购物车</button>
  <p id="cart-msg" role="status" aria-live="polite"></p>
</form>

<script define:vars={{ productId }}>
  import { apiFetch, getCartId, setCartId } from "../../lib/cart"
  import { incrementCart, decrementCart } from "../../stores/cartStore"
  // variant change → update output.textContent
  // click → POST line-items + optimistic incrementCart
</script>
```

完整源码见仓库 `ProductAddToCart.astro`。流程：[cart-checkout-auth.md](cart-checkout-auth.md)

---

## §MiniCart — 简化加购（文档示例，可选）

完整模板见 [islands-strategy.md](islands-strategy.md) §2.3。新项目优先 **ProductAddToCart**（含 SKU / output）。

---

## §SSR 页 — cart.astro 头

```astro
---
export const prerender = false
import BaseLayout from "../layouts/BaseLayout.astro"
---
```

---

## §Header 角标 — CartBadge.astro（无 Preact）

见 [islands-strategy.md](islands-strategy.md) §2.4。`BaseLayout` 内：

```astro
import CartBadge from "../components/cart/CartBadge.astro"
<!-- nav 中 -->
<CartBadge />
```

---

## §保留 MVP 封装（过渡期）

迁移完成前，`lib/cart.ts` / `lib/auth.ts` 继续用于 checkout/account；  
新页面优先 Content Layer + Nano Stores，逐步替换内联 script。
