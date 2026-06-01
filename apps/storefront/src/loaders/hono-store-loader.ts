import type { Loader } from "astro/loaders"
import { fetchAllPaginated, fetchStoreJson } from "../lib/store-api"

type ListProduct = {
  id: string
  handle: string
  title: string
  subtitle?: string | null
  description?: string | null
  thumbnail?: string | null
  price?: number | null
}

type ProductDetail = {
  product: {
    id: string
    handle: string
    title: string
    subtitle?: string | null
    description?: string | null
    thumbnail?: string | null
    variants?: Array<{
      id: string
      title?: string | null
      sku?: string | null
      inventory_quantity?: number | null
      price?: { amount: number; currency_code: string } | null
    }>
  }
}

function mapDetail(raw: ProductDetail["product"]) {
  const variants = raw.variants ?? []
  const firstPrice = variants.find((v) => v.price?.amount != null)?.price?.amount
  const totalStock = variants.reduce(
    (sum, v) => sum + (v.inventory_quantity ?? 0),
    0,
  )

  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    subtitle: raw.subtitle ?? "",
    description: raw.description ?? "",
    coverImage: raw.thumbnail ?? "",
    thumbnail: raw.thumbnail ?? "",
    price: firstPrice ?? 0,
    stock: totalStock,
    variants: variants.map((v) => ({
      id: v.id,
      title: v.title ?? null,
      sku: v.sku ?? null,
      priceAmount: v.price?.amount ?? null,
      stock: v.inventory_quantity ?? null,
    })),
  }
}

export function honoStoreLoader(): Loader {
  return {
    name: "hono-store-products",
    load: async ({ store, logger }) => {
      logger.info("Syncing products from Hono Store API...")
      store.clear()

      const list = await fetchAllPaginated<ListProduct>(
        "/store/products",
        "products",
      )

      for (const item of list) {
        const handle = item.handle || item.id
        try {
          const detail = await fetchStoreJson<ProductDetail>(
            `/store/products/${handle}`,
          )
          store.set({ id: handle, data: mapDetail(detail.product) })
        } catch (err) {
          logger.warn(`Skip product ${handle}: ${err}`)
        }
      }

      logger.info(`Synced ${list.length} products`)
    },
  }
}
