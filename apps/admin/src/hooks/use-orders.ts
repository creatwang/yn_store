import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, parseJsonResponse, toRpcQuery } from "@/lib/api"
import type {
  CreateOrderInput,
  UpdateOrderInput,
} from "@my-store/validators"
import type { AdminGetOrdersParamsType } from "@my-store/validators/admin-list-params"
import type { OrderDetailResponse, OrderListResponse } from "@/types/api"

const defaultListQuery: AdminGetOrdersParamsType = {
  limit: 50,
  offset: 0,
  order: undefined,
}

export function useOrders(params: AdminGetOrdersParamsType = defaultListQuery) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: async () => {
      const res = await api.admin.orders.$get({
        query: toRpcQuery(params) as never,
      })
      return parseJsonResponse<OrderListResponse>(res)
    },
  })
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const res = await api.admin.orders[":id"].$get({ param: { id } })
      return parseJsonResponse<OrderDetailResponse>(res)
    },
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateOrderInput) => {
      const res = await api.admin.orders.$post({ json: data })
      return parseJsonResponse<OrderDetailResponse>(res)
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
      return parseJsonResponse<OrderDetailResponse>(res)
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
      return parseJsonResponse<OrderDetailResponse>(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      queryClient.invalidateQueries({ queryKey: ["order", id] })
    },
  })
}
