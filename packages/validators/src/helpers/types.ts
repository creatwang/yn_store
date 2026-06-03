/** Minimal type stubs for synced Medusa validators (no @medusajs/framework/types dep) */

export type OperatorMap<T = string> = T | T[] | Record<string, T | T[] | undefined>

export type FilterableProductProps = Record<string, unknown>

export type BatchMethodRequest<TCreate = unknown, TUpdate = unknown, TDelete = unknown> = {
  create?: TCreate[]
  update?: TUpdate[]
  delete?: TDelete[]
}

export namespace HttpTypes {
  export type AdminBatchProductRequest = BatchMethodRequest

  export type AdminBatchImageVariantRequest = {
    add?: string[]
    remove?: string[]
  }
  export type AdminBatchVariantImagesRequest = {
    add?: string[]
    remove?: string[]
  }
  export type AdminImportProductsRequest = Record<string, unknown>

  export type AdminUploadPreSignedUrlRequest = {
    originalname: string
    mime_type: string
    size: number
    access?: "public" | "private"
  }
}
