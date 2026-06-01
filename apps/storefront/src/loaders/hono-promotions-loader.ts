import type { Loader } from "astro/loaders"
import { fetchAllPaginated } from "../lib/store-api"

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
      logger.info("Syncing promotions...")
      store.clear()

      const list = await fetchAllPaginated<Promotion>(
        "/store/promotions",
        "promotions",
      )

      for (const promo of list) {
        store.set({
          id: promo.id,
          data: {
            code: promo.code,
            type: promo.type,
            isAutomatic: promo.is_automatic,
          },
        })
      }

      logger.info(`Synced ${list.length} promotions`)
    },
  }
}
