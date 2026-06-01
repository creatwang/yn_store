import type { Loader } from "astro/loaders"
import { fetchAllPaginated, fetchStoreJson } from "../lib/store-api"

type CollectionListItem = {
  id: string
  handle: string
  title: string
}

type CollectionDetail = {
  collection: {
    id: string
    handle: string
    title: string
    products?: Array<{
      id: string
      title: string
      handle: string
      thumbnail?: string | null
      subtitle?: string | null
    }>
  }
}

export function honoCollectionsLoader(): Loader {
  return {
    name: "hono-store-collections",
    load: async ({ store, logger }) => {
      logger.info("Syncing collections...")
      store.clear()

      const list = await fetchAllPaginated<CollectionListItem>(
        "/store/collections",
        "collections",
      )

      for (const item of list) {
        const handle = item.handle || item.id
        try {
          const detail = await fetchStoreJson<CollectionDetail>(
            `/store/collections/${handle}`,
          )
          const col = detail.collection
          store.set({
            id: handle,
            data: {
              id: col.id,
              handle: col.handle,
              title: col.title,
              products: (col.products ?? []).map((p) => ({
                id: p.id,
                title: p.title,
                handle: p.handle,
                thumbnail: p.thumbnail ?? "",
                subtitle: p.subtitle ?? "",
              })),
            },
          })
        } catch (err) {
          logger.warn(`Skip collection ${handle}: ${err}`)
        }
      }

      logger.info(`Synced ${list.length} collections`)
    },
  }
}
