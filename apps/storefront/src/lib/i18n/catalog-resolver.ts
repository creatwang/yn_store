import { getCollection, getEntry } from "astro:content"
import type { StoreLocale } from "./locale"
import { contentEntryId } from "./content-id"
import { isStaticContentMode } from "./ssg-locales"
import {
  getCollectionByHandle as fetchCollectionByHandle,
  getProductByHandle as fetchProductByHandle,
  listCollectionSummaries as fetchCollectionSummaries,
  listProducts as fetchListProducts,
  listPromotions as fetchListPromotions,
  type CatalogCollection,
  type CatalogProduct,
  type CatalogPromotion,
} from "../catalog/server"
import { storeClient } from "../api"

function mapProductEntry(entry: {
  data: {
    id: string
    handle: string
    title: string
    subtitle: string
    description: string
    coverImage: string
    thumbnail: string
    price: number
    stock: number
    variants: CatalogProduct["variants"]
  }
}): CatalogProduct {
  return {
    id: entry.data.id,
    handle: entry.data.handle,
    title: entry.data.title,
    subtitle: entry.data.subtitle,
    description: entry.data.description,
    coverImage: entry.data.coverImage,
    thumbnail: entry.data.thumbnail,
    price: entry.data.price,
    stock: entry.data.stock,
    variants: entry.data.variants,
  }
}

function mapCollectionEntry(entry: {
  data: {
    id: string
    handle: string
    title: string
    products: CatalogCollection["products"]
  }
}): CatalogCollection {
  return {
    id: entry.data.id,
    handle: entry.data.handle,
    title: entry.data.title,
    products: entry.data.products,
  }
}

function mapPromotionEntry(entry: {
  id: string
  data: { code: string; type: string; isAutomatic: boolean }
}): CatalogPromotion {
  return {
    id: entry.id.split("::").pop() ?? entry.id,
    code: entry.data.code,
    type: entry.data.type,
    isAutomatic: entry.data.isAutomatic,
  }
}

function syncRuntimeLocale(locale: StoreLocale) {
  storeClient.setLocale(locale)
}

export async function resolveProducts(locale: StoreLocale): Promise<CatalogProduct[]> {
  if (isStaticContentMode()) {
    const entries = await getCollection("products", ({ data }) => data.locale === locale)
    return entries.map(mapProductEntry)
  }
  syncRuntimeLocale(locale)
  return fetchListProducts()
}

export async function resolveProductByHandle(
  locale: StoreLocale,
  handle: string,
): Promise<CatalogProduct | null> {
  if (isStaticContentMode()) {
    const entry = await getEntry("products", contentEntryId(locale, handle))
    return entry ? mapProductEntry(entry) : null
  }
  syncRuntimeLocale(locale)
  return fetchProductByHandle(handle)
}

export async function resolveCollectionSummaries(
  locale: StoreLocale,
): Promise<Array<{ id: string; handle: string; title: string }>> {
  if (isStaticContentMode()) {
    const entries = await getCollection("collections", ({ data }) => data.locale === locale)
    return entries.map((e) => ({
      id: e.data.id,
      handle: e.data.handle,
      title: e.data.title,
    }))
  }
  syncRuntimeLocale(locale)
  return fetchCollectionSummaries()
}

export async function resolveCollectionByHandle(
  locale: StoreLocale,
  handle: string,
): Promise<CatalogCollection | null> {
  if (isStaticContentMode()) {
    const entry = await getEntry("collections", contentEntryId(locale, handle))
    return entry ? mapCollectionEntry(entry) : null
  }
  syncRuntimeLocale(locale)
  return fetchCollectionByHandle(handle)
}

export async function resolvePromotions(locale: StoreLocale): Promise<CatalogPromotion[]> {
  if (isStaticContentMode()) {
    const entries = await getCollection("promotions", ({ data }) => data.locale === locale)
    return entries.map(mapPromotionEntry)
  }
  syncRuntimeLocale(locale)
  return fetchListPromotions()
}
