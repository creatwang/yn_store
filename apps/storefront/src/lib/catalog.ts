import { fetchAllPaginated, fetchStoreJson } from "./store-api"

export type CatalogVariant = {
  id: string
  title: string | null
  sku: string | null
  priceAmount: number | null
  stock: number | null
}

export type CatalogProduct = {
  id: string
  handle: string
  title: string
  subtitle: string
  description: string
  coverImage: string
  thumbnail: string
  price: number
  stock: number
  variants: CatalogVariant[]
}

export type CatalogCollection = {
  id: string
  handle: string
  title: string
  products: Array<{
    id: string
    title: string
    handle: string
    thumbnail: string
    subtitle: string
  }>
}

export type CatalogPromotion = {
  id: string
  code: string
  type: string
  isAutomatic: boolean
}

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

function mapProductDetail(raw: ProductDetail["product"]): CatalogProduct {
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

function mapListProduct(item: ListProduct): CatalogProduct {
  return {
    id: item.id,
    handle: item.handle || item.id,
    title: item.title,
    subtitle: item.subtitle ?? "",
    description: item.description ?? "",
    coverImage: item.thumbnail ?? "",
    thumbnail: item.thumbnail ?? "",
    price: item.price ?? 0,
    stock: 0,
    variants: [],
  }
}

export async function listProducts(): Promise<CatalogProduct[]> {
  const list = await fetchAllPaginated<ListProduct>("/store/products", "products")
  return list.map(mapListProduct)
}

export async function getProductByHandle(
  handle: string,
): Promise<CatalogProduct | null> {
  try {
    const detail = await fetchStoreJson<ProductDetail>(`/store/products/${handle}`)
    return mapProductDetail(detail.product)
  } catch {
    return null
  }
}

export async function listCollectionSummaries(): Promise<
  Array<{ id: string; handle: string; title: string }>
> {
  return fetchAllPaginated<{ id: string; handle: string; title: string }>(
    "/store/collections",
    "collections",
  )
}

export async function listCollections(): Promise<CatalogCollection[]> {
  const list = await listCollectionSummaries()

  const collections = await Promise.all(
    list.map(async (item) => {
      const handle = item.handle || item.id
      try {
        return await getCollectionByHandle(handle)
      } catch {
        return null
      }
    }),
  )

  return collections.filter((c): c is CatalogCollection => c != null)
}

export async function getCollectionByHandle(
  handle: string,
): Promise<CatalogCollection | null> {
  try {
    const detail = await fetchStoreJson<{ collection: CatalogCollection }>(
      `/store/collections/${handle}`,
    )
    const col = detail.collection
    return {
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
    }
  } catch {
    return null
  }
}

export async function listPromotions(): Promise<CatalogPromotion[]> {
  const list = await fetchAllPaginated<{
    id: string
    code: string
    type: string
    is_automatic: boolean
  }>("/store/promotions", "promotions")

  return list.map((promo) => ({
    id: promo.id,
    code: promo.code,
    type: promo.type,
    isAutomatic: promo.is_automatic,
  }))
}