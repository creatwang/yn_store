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
