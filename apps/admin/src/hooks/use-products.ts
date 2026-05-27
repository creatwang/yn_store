import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { CreateProductInput, UpdateProductInput } from "@my-store/validators"

export function useProducts(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: async () => {
      const res = await api.admin.products.$get({ query: params })
      return await res.json()
    },
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await api.admin.products[":id"].$get({ param: { id } })
      return await res.json()
    },
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateProductInput) => {
      const res = await api.admin.products.$post({ json: data })
      return await res.json()
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
      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["product", id] })
    },
  })
}