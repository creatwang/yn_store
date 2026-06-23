import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineCollection, z } from "astro:content"
import { loadEnv } from "vite"
import { honoStoreLoader } from "./loaders/hono-store-loader"
import { honoCollectionsLoader } from "./loaders/hono-collections-loader"
import { honoPromotionsLoader } from "./loaders/hono-promotions-loader"
import { noopLoader } from "./loaders/noop-loader"

const storefrontRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const env = loadEnv(process.env.NODE_ENV ?? "development", storefrontRoot, "")
const astroOutput = process.env.ASTRO_OUTPUT ?? env.ASTRO_OUTPUT ?? "server"

/** 仅产线 static build 跑 Loader；dev 启动绝不打 API */
const useContentLoader =
  astroOutput === "static" && process.env.NODE_ENV === "production"

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
    locale: z.string(),
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
    locale: z.string(),
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
    locale: z.string(),
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
