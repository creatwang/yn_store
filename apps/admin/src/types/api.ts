/** Admin API 响应形状（与 server services 返回对齐，供 hooks / 页面类型推断） */

export type ProductRow = {
  id: string
  title: string
  handle: string
  status?: string | null
  subtitle?: string | null
  description?: string | null
  thumbnail?: string | null
  variants?: unknown[]
}

export type ProductListResponse = {
  products: ProductRow[]
  count: number
}

export type ProductDetailResponse = {
  product: ProductRow
  variants?: unknown[]
}

export type OrderRow = {
  id: string
  display_id?: number | null
  status?: string | null
  email?: string | null
  currency_code?: string | null
  created_at?: string | null
  region_id?: string | null
  sales_channel_id?: string | null
}

export type OrderListResponse = {
  orders: OrderRow[]
  count: number
}

export type OrderDetailResponse = {
  order: OrderRow
}

export type CustomerRow = {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  has_account?: boolean | null
  phone?: string | null
  company_name?: string | null
  created_at?: string | null
}

export type CustomerListResponse = {
  customers: CustomerRow[]
  count: number
}

export type CustomerDetailResponse = {
  customer: CustomerRow
}

export type CreateProductResponse = {
  product: ProductRow
}
