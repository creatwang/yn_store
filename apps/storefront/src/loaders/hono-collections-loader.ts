import type { Loader } from "astro/loaders"
import { contentEntryId } from "../lib/i18n/content-id"
import { getSsgLocales } from "../lib/i18n/ssg-locales"
import { StoreApiClient } from "../lib/api"

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
      logger.info("Syncing collections (multi-locale)...")
      store.clear()

      let total = 0
      for (const locale of getSsgLocales()) {
        const client = new StoreApiClient(locale)
        logger.info(`  locale ${locale}`)

        const list = await client.fetchAllPaginated<CollectionListItem>(
          "/store/collections",
          "collections",
        )

        for (const item of list) {
          const handle = item.handle || item.id
          try {
            const detail = await client.fetchJson<CollectionDetail>(
              `/store/collections/${handle}`,
            )
            const col = detail.collection
            store.set({
              id: contentEntryId(locale, handle),
              data: {
                locale,
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
            total += 1
          } catch (err) {
            logger.warn(`Skip collection ${locale}/${handle}: ${err}`)
          }
        }
      }

      logger.info(`Synced ${total} localized collection entries`)
    },
  }
}
