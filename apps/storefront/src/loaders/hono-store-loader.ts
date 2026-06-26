import type { Loader } from "astro/loaders"
import { contentEntryId } from "../lib/i18n/content-id"
import { getSsgLocalesAsync } from "../lib/i18n/ssg-locales"
import { StoreApiClient } from "../lib/api"

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

function mapDetail(raw: ProductDetail["product"], locale: string) {
  const variants = raw.variants ?? []
  const firstPrice = variants.find((v) => v.price?.amount != null)?.price?.amount
  const totalStock = variants.reduce(
    (sum, v) => sum + (v.inventory_quantity ?? 0),
    0,
  )

  return {
    locale,
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
      logger.info("Syncing products from Hono Store API (multi-locale)...")
      store.clear()

      let total = 0
      const locales = await getSsgLocalesAsync()
      for (const locale of locales) {
        const client = new StoreApiClient(locale)
        logger.info(`  locale ${locale}`)

        const list = await client.fetchAllPaginated<ListProduct>(
          "/store/products",
          "products",
        )

        for (const item of list) {
          const handle = item.handle || item.id
          try {
            const detail = await client.fetchJson<ProductDetail>(
              `/store/products/${handle}`,
            )
            store.set({
              id: contentEntryId(locale, handle),
              data: mapDetail(detail.product, locale),
            })
            total += 1
          } catch (err) {
            logger.warn(`Skip product ${locale}/${handle}: ${err}`)
          }
        }
      }

      logger.info(`Synced ${total} localized product entries`)
    },
  }
}
