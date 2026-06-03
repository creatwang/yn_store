// @ts-nocheck
import { FetchError } from "@medusajs/js-sdk"
import {
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
} from "@tanstack/react-query"
import { sdk } from "../../lib/client"
import { queryClient } from "../../lib/query-client"
import { queryKeysFactory } from "../../lib/query-key-factory"
import { ordersQueryKeys } from "./orders"

const DRAFT_ORDERS_QUERY_KEY = "draft_orders" as const
export const draftOrdersQueryKeys = queryKeysFactory(DRAFT_ORDERS_QUERY_KEY)

export type DraftOrderRecord = Record<string, unknown> & {
  id: string
  email?: string | null
  currency_code?: string
  region_id?: string | null
  customer_id?: string | null
  items?: DraftOrderItemRecord[]
  draft_shipping_methods?: DraftShippingMethodRecord[]
}

export type DraftOrderItemRecord = {
  id: string
  line_item_id: string
  title?: string | null
  variant_id?: string | null
  quantity: number
  unit_price?: number | null
  edit_action_id?: string | null
}

export type DraftShippingMethodRecord = {
  id: string
  shipping_option_id: string
  amount?: number
}

const invalidateDraft = (id: string) => {
  queryClient.invalidateQueries({ queryKey: draftOrdersQueryKeys.detail(id) })
  queryClient.invalidateQueries({ queryKey: ordersQueryKeys.detail(id) })
  queryClient.invalidateQueries({ queryKey: ordersQueryKeys.preview(id) })
}

export const useDraftOrder = (
  id: string,
  options?: Omit<
    UseQueryOptions<{ draft_order: DraftOrderRecord }, FetchError, QueryKey>,
    "queryFn" | "queryKey"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () => sdk.admin.draftOrder.retrieve(id),
    queryKey: draftOrdersQueryKeys.detail(id),
    ...options,
  })

  return { ...data, ...rest }
}

export const useDraftOrders = (
  query?: Record<string, unknown>,
  options?: Omit<
    UseQueryOptions<
      { draft_orders: DraftOrderRecord[]; count?: number },
      FetchError,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () => sdk.admin.draftOrder.list(query),
    queryKey: draftOrdersQueryKeys.list(query),
    ...options,
  })

  return { ...data, ...rest }
}

export const useCreateDraftOrder = (
  options?: UseMutationOptions<
    { draft_order: DraftOrderRecord },
    FetchError,
    Record<string, unknown>
  >,
) => {
  return useMutation({
    mutationFn: (payload) => sdk.admin.draftOrder.create(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: draftOrdersQueryKeys.lists() })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdateDraftOrder = (
  id: string,
  options?: UseMutationOptions<
    { draft_order: DraftOrderRecord },
    FetchError,
    Record<string, unknown>
  >,
) => {
  return useMutation({
    mutationFn: (payload) => sdk.admin.draftOrder.update(id, payload),
    onSuccess: (data, variables, context) => {
      invalidateDraft(id)
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDeleteDraftOrder = (
  id: string,
  options?: UseMutationOptions<{ id: string }, FetchError, void>,
) => {
  return useMutation({
    mutationFn: () => sdk.admin.draftOrder.delete(id),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: draftOrdersQueryKeys.lists() })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useConvertDraftOrder = (
  id: string,
  options?: UseMutationOptions<
    { order: Record<string, unknown> },
    FetchError,
    void
  >,
) => {
  return useMutation({
    mutationFn: () => sdk.admin.draftOrder.convertToOrder(id),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: draftOrdersQueryKeys.lists() })
      invalidateDraft(id)
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.lists() })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useAddDraftOrderItems = (
  id: string,
  options?: UseMutationOptions<
    Record<string, unknown>,
    FetchError,
    {
      items: {
        variant_id?: string
        quantity: number
        unit_price?: number
        title?: string
      }[]
    }
  >,
) => {
  return useMutation({
    mutationFn: (payload) => sdk.admin.draftOrder.addItems(id, payload),
    onSuccess: (data, variables, context) => {
      invalidateDraft(id)
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useRemoveDraftOrderItem = (
  id: string,
  options?: UseMutationOptions<Record<string, unknown>, FetchError, string>,
) => {
  return useMutation({
    mutationFn: (actionId) => sdk.admin.draftOrder.removeItem(id, actionId),
    onSuccess: (data, variables, context) => {
      invalidateDraft(id)
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useAddDraftOrderShippingMethod = (
  id: string,
  options?: UseMutationOptions<
    Record<string, unknown>,
    FetchError,
    { shipping_option_id: string; amount?: number }
  >,
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.admin.draftOrder.addShippingMethod(id, payload),
    onSuccess: (data, variables, context) => {
      invalidateDraft(id)
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useRemoveDraftOrderShippingMethod = (
  id: string,
  options?: UseMutationOptions<Record<string, unknown>, FetchError, string>,
) => {
  return useMutation({
    mutationFn: (actionId) =>
      sdk.admin.draftOrder.removeShippingMethod(id, actionId),
    onSuccess: (data, variables, context) => {
      invalidateDraft(id)
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
