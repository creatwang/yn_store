import { getCollection } from "astro:content"
import { getSsgLocalesAsync, localeSegmentForBuild } from "./ssg-locales"

export async function buildLocaleIndexPaths() {
  const locales = await getSsgLocalesAsync()
  return locales.map((locale) => ({
    params: { locale: localeSegmentForBuild(locale) },
  }))
}

export async function buildLocaleProductPaths() {
  const paths: Array<{ params: { locale: string; handle: string } }> = []
  const locales = await getSsgLocalesAsync()

  for (const locale of locales) {
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
  const locales = await getSsgLocalesAsync()

  for (const locale of locales) {
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
