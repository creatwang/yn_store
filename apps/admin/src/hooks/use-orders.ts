import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { ListOrdersQuery, CreateOrderInput, UpdateOrderInput } from "@my-store/validators"

export function useOrders(params?: ListOrdersQuery) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: async () => {
      const res = await api.admin.orders.$get({ query: params })
      return await res.json()
    },
  })
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const res = await api.admin.orders[":id"].$get({ param: { id } })
      return await res.json()
    },
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateOrderInput) => {
      const res = await api.admin.orders.$post({ json: data })
      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
    },
  })
}

export function useUpdateOrder(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateOrderInput) => {
      const res = await api.admin.orders[":id"].$post({ param: { id }, json: data })
      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      queryClient.invalidateQueries({ queryKey: ["order", id] })
    },
  })
}

export function useCancelOrder(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await api.admin.orders[":id"].cancel.$post({ param: { id } })
      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      queryClient.invalidateQueries({ queryKey: ["order", id] })
    },
  })
}