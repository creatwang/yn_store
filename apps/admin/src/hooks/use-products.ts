import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, parseJsonResponse, toRpcQuery } from "@/lib/api"
import type {
  CreateProductInput,
  UpdateProductInput,
} from "@my-store/validators"
import type { AdminGetProductsParamsType } from "@my-store/validators/admin-list-params"
import type {
  CreateProductResponse,
  ProductDetailResponse,
  ProductListResponse,
} from "@/types/api"

const defaultListQuery: AdminGetProductsParamsType = {
  limit: 50,
  offset: 0,
  order: undefined,
}

export function useProducts(params: AdminGetProductsParamsType = defaultListQuery) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: async () => {
      const res = await api.admin.products.$get({
        query: toRpcQuery(params as Record<string, unknown>),
      })
      return parseJsonResponse<ProductListResponse>(res)
    },
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await api.admin.products[":id"].$get({ param: { id } })
      return parseJsonResponse<ProductDetailResponse>(res)
    },
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateProductInput) => {
      const res = await api.admin.products.$post({ json: data })
      return parseJsonResponse<CreateProductResponse>(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
  })
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateProductInput) => {
      const res = await api.admin.products[":id"].$post({ param: { id }, json: data })
      return parseJsonResponse<ProductDetailResponse>(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["product", id] })
    },
  })
}
