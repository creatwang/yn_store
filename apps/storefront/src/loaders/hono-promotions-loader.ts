import type { Loader } from "astro/loaders"
import { contentEntryId } from "../lib/i18n/content-id"
import { getSsgLocales } from "../lib/i18n/ssg-locales"
import { StoreApiClient } from "../lib/api"

type Promotion = {
  id: string
  code: string
  type: string
  is_automatic: boolean
}

export function honoPromotionsLoader(): Loader {
  return {
    name: "hono-store-promotions",
    load: async ({ store, logger }) => {
      logger.info("Syncing promotions (multi-locale)...")
      store.clear()

      let total = 0
      for (const locale of getSsgLocales()) {
        const client = new StoreApiClient(locale)
        const list = await client.fetchAllPaginated<Promotion>(
          "/store/promotions",
          "promotions",
        )

        for (const promo of list) {
          store.set({
            id: contentEntryId(locale, promo.id),
            data: {
              locale,
              code: promo.code,
              type: promo.type,
              isAutomatic: promo.is_automatic,
            },
          })
          total += 1
        }
      }

      logger.info(`Synced ${total} localized promotion entries`)
    },
  }
}
