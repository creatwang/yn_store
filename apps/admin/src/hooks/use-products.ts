import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, getAuthHeaders } from "@/lib/api"
import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from "@my-store/validators"

const headers = () => getAuthHeaders()

function toQueryString(q?: Partial<ListProductsQuery>) {
  if (!q) return undefined
  return {
    ...(q.q && { q: q.q }),
    ...(q.status && { status: q.status }),
    ...(q.order && { order: q.order }),
    limit: String(q.limit ?? 20),
    offset: String(q.offset ?? 0),
  }
}

export function useProducts(query?: Partial<ListProductsQuery>) {
  return useQuery({
    queryKey: ["products", query],
    queryFn: async () => {
      const res = await api.api.admin.products.$get(
        { query: toQueryString(query) ?? { limit: "20", offset: "0" } },
        { headers: headers() }
      )
      if (!res.ok) throw new Error("获取商品列表失败")
      return res.json()
    },
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await api.api.admin.products[":id"].$get(
        { param: { id } },
        { headers: headers() }
      )
      if (!res.ok) throw new Error("获取商品详情失败")
      return res.json()
    },
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateProductInput) => {
      const res = await api.api.admin.products.$post(
        { json: input },
        { headers: headers() }
      )
      if (!res.ok) throw new Error("创建商品失败")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
  })
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateProductInput) => {
      const res = await api.api.admin.products[":id"].$post(
        { param: { id }, json: input },
        { headers: headers() }
      )
      if (!res.ok) throw new Error("更新商品失败")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["product", id] })
    },
  })
}
