import { defineCollection, z } from "astro:content"
import { honoStoreLoader } from "./loaders/hono-store-loader"
import { honoCollectionsLoader } from "./loaders/hono-collections-loader"
import { honoPromotionsLoader } from "./loaders/hono-promotions-loader"
import { noopLoader } from "./loaders/noop-loader"

/** SSR 模式跳过 Loader 全量同步，页面改走 lib/catalog.ts 按需 fetch */
const useContentLoader = process.env.ASTRO_OUTPUT !== "server"

const variantSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  sku: z.string().nullable(),
  priceAmount: z.number().nullable(),
  stock: z.number().nullable(),
})

const productsCollection = defineCollection({
  loader: useContentLoader ? honoStoreLoader() : noopLoader("noop-products"),
  schema: z.object({
    id: z.string(),
    handle: z.string(),
    title: z.string(),
    subtitle: z.string(),
    description: z.string(),
    coverImage: z.string(),
    thumbnail: z.string(),
    price: z.number(),
    stock: z.number(),
    variants: z.array(variantSchema),
  }),
})

const collectionsCollection = defineCollection({
  loader: useContentLoader ? honoCollectionsLoader() : noopLoader("noop-collections"),
  schema: z.object({
    id: z.string(),
    handle: z.string(),
    title: z.string(),
    products: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        handle: z.string(),
        thumbnail: z.string(),
        subtitle: z.string(),
      }),
    ),
  }),
})

const promotionsCollection = defineCollection({
  loader: useContentLoader ? honoPromotionsLoader() : noopLoader("noop-promotions"),
  schema: z.object({
    code: z.string(),
    type: z.string(),
    isAutomatic: z.boolean(),
  }),
})

export const collections = {
  products: productsCollection,
  collections: collectionsCollection,
  promotions: promotionsCollection,
}
