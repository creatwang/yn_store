# 图片优化方案（Astro 官方 · 电商 C 端）

> 依据：`https://docs.astro.build/zh-cn/guides/images/`  
> `https://docs.astro.build/zh-cn/reference/image-service-reference/`  
> 落地项目：`my-medusa-store-hono/apps/storefront`（商品图来自 Hono Store API 远程 URL）

---

## 1. 电商场景原则

| 场景 | 必须 | 禁止 |
|------|------|------|
| 商品列表卡片 | `<Image />` + 宽高 + `layout="constrained"` | 裸 `<img src={thumbnail}>` |
| PDP 主图（LCP） | `<Image loading="eager" fetchpriority="high" />` | 主图 `loading="lazy"` |
| 商品图集 | `<Picture formats={['avif','webp']} />` | public/ 原图直出 |
| 装饰图/图标 | `alt=""` 或 SVG 组件 | 省略 alt |
| Medusa 远程 thumbnail | 配置 `image.domains` / `remotePatterns` | 未授权域名（不优化且可能报错） |

**核心收益**：Sharp 转 WebP/AVIF、自动生成 `srcset`、推断 width/height **防 CLS**、强制 `alt`。

---

## 2. astro.config.mjs（storefront 必配）

```javascript
// apps/storefront/astro.config.mjs
import { defineConfig, passthroughImageService } from "astro/config"
import tailwind from "@astrojs/tailwind"
// 禁止 @astrojs/react

const isCf = process.env.ADAPTER === "cloudflare"

export default defineConfig({
  output: "hybrid",
  integrations: [tailwind()],
  server: { port: 4321 },
  image: {
    // 远程 Medusa / CDN 域名（按实际替换）
    domains: ["cdn.example.com", "localhost"],
    remotePatterns: [{ protocol: "https" }],
    // 全局响应式（Astro 5.10+）
    layout: "constrained",
    responsiveStyles: true,
    // Cloudflare 等无 Sharp 环境改用透传（仍享受 alt/CLS 约束）
    service: isCf ? passthroughImageService() : undefined,
  },
})
```

---

## 3. 远程商品图（Hono Store API）

Store 返回的 `thumbnail` / `images[]` 为 **HTTPS 完整 URL**，必须用授权域名。

### 3.1 列表卡片组件

```astro
---
// src/components/product/ProductCardImage.astro
import { Image } from "astro:assets"

interface Props {
  src: string
  alt: string
}

const { src, alt } = Astro.props
---

<Image
  src={src}
  alt={alt}
  width={400}
  height={400}
  layout="constrained"
  loading="lazy"
  decoding="async"
  class="aspect-square w-full object-cover"
/>
```

### 3.2 PDP 主图（LCP 优化）

```astro
---
import { Picture } from "astro:assets"

const { coverImage, title } = Astro.props
---

<Picture
  src={coverImage}
  formats={["avif", "webp"]}
  alt={title}
  width={800}
  height={800}
  layout="constrained"
  loading="eager"
  fetchpriority="high"
  decoding="async"
  class="rounded-lg"
/>
```

### 3.3 构建输出差异

| 模式 | 输出 |
|------|------|
| SSG（`getStaticPaths`） | `/_astro/*.hash.webp`，build 时优化 |
| SSR（`prerender = false`） | `/_image?href=...&w=&h=&f=webp` 按需转换 |

---

## 4. 本地静态资源

| 位置 | 用法 |
|------|------|
| `src/assets/` | `import img from '../assets/x.png'` → `<Image src={img} />` |
| `public/` | 仅 favicon、固定不处理资源；**商品图不要放 public** |

```astro
---
import { Image } from "astro:assets"
import placeholder from "../assets/product-placeholder.png"
---
<Image src={placeholder} alt="暂无商品图" width={400} height={400} />
```

---

## 5. `<Picture />` vs `<Image />`

| 组件 | 适用 |
|------|------|
| `<Image />` | 列表、缩略图、单一格式 |
| `<Picture />` | PDP 主图，多格式 fallback（avif → webp → png） |

官方 `<Picture />` 输出示例：

```html
<picture>
  <source srcset="/_astro/xxx.avif" type="image/avif" />
  <source srcset="/_astro/xxx.webp" type="image/webp" />
  <img src="/_astro/xxx.png" width="800" height="800" loading="lazy" alt="..." />
</picture>
```

---

## 6. 响应式图像（Astro 5.10+）

全局或单组件设置 `layout`：

| layout | 行为 |
|--------|------|
| `constrained` | 最大宽度 = 指定 width，生成 srcset |
| `full-width` | 100% 容器宽 |
| `fixed` | 固定尺寸 |

```astro
<Image
  src={coverImage}
  alt={title}
  width={800}
  height={600}
  layout="constrained"
/>
```

自动生成 `srcset`、`sizes`，配合 `image.responsiveStyles: true`（Tailwind 4 若冲突见官方说明）。

---

## 7. `getImage()` 高级用法

用于自定义组件、OG 图、API 路由返回优化 URL：

```astro
---
import { getImage } from "astro:assets"

const optimized = await getImage({
  src: product.coverImage,
  width: 1200,
  height: 630,
  format: "webp",
})
---
<meta property="og:image" content={optimized.src} />
```

---

## 8. Content Collection 中的图片

Loader 若只存 URL 字符串，Zod 用 `z.string().url()`。  
若存本地相对路径，用 schema 的 `image()` helper：

```typescript
import { defineCollection, z } from "astro:content"

const products = defineCollection({
  loader: honoStoreLoader(),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      cover: image().optional(), // 本地相对路径时
      coverUrl: z.string().url().optional(), // 远程 Medusa 图
    }),
})
```

远程 URL 走 `coverUrl` + `<Image src={data.coverUrl} />`。

---

## 9. DAM / CDN 集成（可选）

Medusa 图在 OSS/COS/Cloudinary 时：

### 方案 A：Astro 授权远程 + `<Image />`

配置 `domains` 指向 CDN 域名（最简单，与现 API 兼容）。

### 方案 B：Cloudinary Astro SDK

```bash
pnpm add astro-cloudinary --filter=@my-store/storefront
```

```astro
---
import { CldImage } from "astro-cloudinary"
---
<CldImage src="<public_id>" width={800} height={800} alt={title} />
```

Loader 可用 `cldAssetsLoader` 替代自研 hono loader（图在 Cloudinary 时）。

文档：`https://docs.astro.build/zh-cn/guides/media/cloudinary/`

---

## 10. 部署适配

> **完整矩阵**：[adapter-deployment.md](adapter-deployment.md)

| 平台 | 图像服务 |
|------|----------|
| Node / Vercel（默认） | Sharp |
| Cloudflare Workers | `passthroughImageService()` 或 CDN 变换 |
| 纯静态托管 only | ❌ 不适用（本项目有 SSR 页） |

无 Sharp 时仍应用 `<Image />` 以强制 **alt + width/height**，避免 CLS。

---

## 11. 电商页面检查清单

**首页 / 列表**

- [ ] 所有商品图用 `<Image layout="constrained" width height loading="lazy" />`
- [ ] 无 thumbnail 时用本地 placeholder（`src/assets`）
- [ ] `remotePatterns` 含 Medusa 图床域名

**PDP**

- [ ] 主图 `<Picture formats={['avif','webp']} loading="eager" fetchpriority="high" />`
- [ ] 副图 lazy
- [ ] 静态价 SEO 可见；注水不改 DOM 主图（避免 CLS）

**全局**

- [ ] 所有商品图有描述性 `alt`（装饰图 `alt=""`）
- [ ] 不用 `public/` 存商品图
- [ ] Lighthouse：CLS < 0.1，LCP 元素为优化后主图

---

## 12. 与 my-medusa-store-hono 现状差距

| 现状 | 目标 | 状态 |
|------|------|------|
| 裸 `<img>` | `ProductCardImage` / `ProductDetailPicture` | ✅ 已落地 |
| 无 `image.domains` | Medusa S3 + `PUBLIC_IMAGE_DOMAINS` | ✅ 已配置 |
| 无 `astro.config` image 段 | Sharp 本地服务 + `layout: constrained` | ✅ 已配置 |
| 无 placeholder | `src/assets/product-placeholder.png` | 待办（无图仍用灰色占位 div） |

迁移步骤见 [migration-checklist.md](migration-checklist.md) Phase 4。

---

## 13. 图像服务 API（Image Service Reference）

> 官方：https://docs.astro.build/zh-cn/reference/image-service-reference/

### 13.1 两类服务

| 类型 | 代表 | 机制 | 本项目 |
|------|------|------|--------|
| **本地服务** | `astro/assets/services/sharp`（默认） | build 时 `transform()` → `dist/_astro/*.webp`；dev/SSR 走 `/_image` 端点 | **默认选用**（Node/Vercel） |
| **外部服务** | Cloudinary / 自定义 CDN URL | `getURL()` 返回 CDN 变换 URL，不经过 Sharp | 图床迁 Cloudinary 时再评估 |
| **透传** | `passthroughImageService()` | 不转码，仍输出 width/height/alt | **Cloudflare Workers**（`ADAPTER=cloudflare`） |

### 13.2 本地 Sharp 生命周期（当前 SSG）

```
<Image src="https://medusa.../tee.png" />
  → build 时 fetch 远程图
  → transform() 转 webp/avif
  → 输出 /_astro/xxx.hash.webp + srcset
```

按需渲染（未来 hybrid 交易页）：

```
<Image ... /> → getURL() → /_image?href=...&w=&h=&f=webp → transform() 运行时
```

### 13.3 钩子（自定义服务时才需）

| 钩子 | 本地 | 外部 | 说明 |
|------|------|------|------|
| `getURL()` | ✅ | ✅ | 生成 img src |
| `parse()` / `parseURL()` | ✅ | — | 解析 `/_image` 查询参数 |
| `transform()` | ✅ | — | Sharp 转码 |
| `getHTMLAttributes()` | 可选 | 可选 | 默认 loading/decoding |
| `validateOptions()` | 可选 | 可选 | 限制 maxWidth 等 |
| `getSrcSet()` | 可选 | 可选 | 自定义 srcset |

**结论**：Medusa 远程 HTTPS 图 + Node 部署 → **无需自定义 Image Service**，默认 Sharp 即最优。

### 13.4 部署矩阵（项目决策）

| 部署目标 | `image.service` | 远程 Medusa 图 |
|----------|-----------------|----------------|
| Node / Docker / Vercel | 默认 Sharp | build 预优化 ✅ |
| 纯静态托管（SSG） | 默认 Sharp | 已 baked 到 `/_astro` ✅ |
| Cloudflare Workers | `passthroughImageService()` | 直链 CDN（或 CDN 自带变换） |
| 全站 Cloudinary DAM | `astro-cloudinary` 或外部 service | Loader 存 public_id |

### 13.5 何时才换方案

| 场景 | 建议 |
|------|------|
| 图全部在 Cloudinary 且已有变换 URL | 外部 service 或 `CldImage` |
| CF Workers 且要转码 | 上游 CDN 变换 + passthrough，或 `@astrojs/cloudflare` + 外部图床 |
| OG 图 1200×630 | `getImage()` 在 layout 生成 meta |
| 购物车行 thumbnail（客户端动态） | 仍可用授权 URL + `<Image />`（SSR）或 passthrough |

---

## 14. 官方错误对照

| 错误 | 原因 | 修复 |
|------|------|------|
| `remote-image-not-allowed` | 域名未授权 | `image.domains` |
| `missing-image-dimension` | 远程图缺 width/height | 显式传入 |
| `image-missing-alt` | 缺 alt | 必填描述 |
| `expected-image` | src 类型不对 | 用 import 或授权 URL 字符串 |

完整列表：`https://docs.astro.build/zh-cn/reference/errors/`（filter: image）
