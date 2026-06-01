# SEO 与元数据规范

> 项目：`my-medusa-store-hono/apps/storefront`  
> 原则：**SSG 目录页可爬、结构化数据完整、CWV 不牺牲**

与 [native-html-components.md](native-html-components.md)（语义 HTML）和 [image-optimization.md](image-optimization.md)（LCP/OG 图）配合使用。

---

## 1. 每页必配（BaseLayout）

| 元数据 | 要求 | 实现位置 |
|--------|------|----------|
| `<title>` | 唯一、含品牌后缀 | `BaseLayout.astro` props |
| `<meta name="description">` | 120–160 字，PDP 用商品描述摘要 | 每页传入 |
| `<link rel="canonical">` | 绝对 URL，防重复收录 | Layout 或每页 |
| `<html lang="zh-CN">` | 多语言后改 hreflang | BaseLayout |
| Open Graph | `og:title` `og:description` `og:image` `og:url` | Layout 扩展 |
| Twitter Card | `summary_large_image` | 可选 |

```astro
---
// layouts/BaseLayout.astro（扩展示意）
interface Props {
  title: string
  description?: string
  canonical?: string
  ogImage?: string
}
const { title, description, canonical, ogImage } = Astro.props
const site = Astro.site?.href ?? "https://example.com"
---
<head>
  <title>{title}</title>
  {description && <meta name="description" content={description} />}
  {canonical && <link rel="canonical" href={canonical} />}
  <meta property="og:title" content={title} />
  {description && <meta property="og:description" content={description} />}
  {ogImage && <meta property="og:image" content={ogImage} />}
</head>
```

---

## 2. Sitemap

```bash
pnpm add @astrojs/sitemap --filter=@my-store/storefront
```

```javascript
// astro.config.mjs
import sitemap from "@astrojs/sitemap"

export default defineConfig({
  site: "https://your-store.com",
  integrations: [tailwind(), sitemap()],
})
```

**条目来源**（目标态）：

- Content Loader `getCollection("products")` → `/products/{handle}`
- 集合 `getCollection("collections")` → `/collections/{handle}`
- 静态页：首页、促销、搜索

Build 后：`/sitemap-index.xml` + `/sitemap-0.xml`

→ 官方：https://docs.astro.build/zh-cn/guides/integrations-guide/sitemap/

---

## 3. robots.txt

`public/robots.txt`：

```
User-agent: *
Allow: /
Disallow: /checkout
Disallow: /cart
Disallow: /account
Sitemap: https://your-store.com/sitemap-index.xml
```

交易页通常 **noindex**（可选 `<meta name="robots" content="noindex">` on cart/checkout/account）。

---

## 4. JSON-LD 结构化数据

### 4.1 PDP — Product

SSG 输出进 HTML，**不依赖客户端 JS**。

```astro
---
// products/[handle].astro 片段
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: product.title,
  description: product.description,
  image: product.thumbnail,
  sku: product.handle,
  offers: {
    "@type": "Offer",
    priceCurrency: "USD",
    price: firstPrice,
    availability: "https://schema.org/InStock",
  },
}
---
<script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
```

价/库存注水：**JSON-LD 用 build 快照价**即可；Google 接受轻微延迟。实时价以可见 DOM（`<output>`）为准。

### 4.2 列表页 — ItemList

```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "url": "https://.../products/t-shirt" }
  ]
}
```

### 4.3 面包屑 — BreadcrumbList

集合 → 商品链路：

```json
{
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "首页", "item": "https://..." },
    { "@type": "ListItem", "position": 2, "name": "T-Shirt", "item": "https://..." }
  ]
}
```

---

## 5. OG 分享图（getImage）

```astro
---
import { getImage } from "astro:assets"

const og = await getImage({
  src: product.thumbnail,
  width: 1200,
  height: 630,
  format: "webp",
})
---
<meta property="og:image" content={new URL(og.src, Astro.site).href} />
```

远程图需已在 `image.domains` 授权。

---

## 6. 语义 HTML × SEO

| 做法 | SEO 收益 |
|------|----------|
| `<article>` 包 PDP | 主内容识别 |
| `<output>` 展示价 | 派生结果语义 |
| `<time datetime>` 促销截止 | 富摘要候选 |
| 不用 div 冒充 heading | 大纲清晰 |
| 全站 `<address>` 联系 | 本地/品牌信号 |

详见 [native-html-components.md](native-html-components.md)。

---

## 7. i18n 与 hreflang（后期）

Astro [i18n recipe](https://docs.astro.build/zh-cn/recipes/i18n/)：

- `/zh-cn/products/...` + `/en/products/...`
- 每页 `<link rel="alternate" hreflang="zh-CN" href="..." />`

---

## 8. 验收清单

- [ ] 所有 SSG 页有唯一 `title` + `description`
- [ ] PDP 有 `Product` JSON-LD
- [ ] `site` + `@astrojs/sitemap` 生成全量 SKU URL
- [ ] canonical 指向生产域
- [ ] LCP 元素（PDP 主图）为 `<Picture fetchpriority="high">`
- [ ] cart/checkout/account 不进入 sitemap（或 noindex）
- [ ] Lighthouse SEO ≥ 95

---

## 9. 现状

| 项 | 状态 |
|----|------|
| title | 🟡 有，缺统一 description |
| sitemap | ❌ |
| JSON-LD | ❌ |
| OG / getImage | ❌ |
| canonical | ❌ |

→ 进度：[implementation-status.md](implementation-status.md) §6
