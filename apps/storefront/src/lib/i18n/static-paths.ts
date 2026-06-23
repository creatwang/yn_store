import { getCollection } from "astro:content"
import { getSsgLocales, localeSegmentForBuild } from "./ssg-locales"

export async function buildLocaleIndexPaths() {
  return getSsgLocales().map((locale) => ({
    params: { locale: localeSegmentForBuild(locale) },
  }))
}

export async function buildLocaleProductPaths() {
  const paths: Array<{ params: { locale: string; handle: string } }> = []

  for (const locale of getSsgLocales()) {
    const segment = localeSegmentForBuild(locale)
    const products = await getCollection("products", ({ data }) => data.locale === locale)
    for (const product of products) {
      paths.push({
        params: { locale: segment, handle: product.data.handle },
      })
    }
  }

  return paths
}

export async function buildLocaleCollectionPaths() {
  const paths: Array<{ params: { locale: string; handle: string } }> = []

  for (const locale of getSsgLocales()) {
    const segment = localeSegmentForBuild(locale)
    const collections = await getCollection(
      "collections",
      ({ data }) => data.locale === locale,
    )
    for (const collection of collections) {
      paths.push({
        params: { locale: segment, handle: collection.data.handle },
      })
    }
  }

  return paths
}
