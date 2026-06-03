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
import { shippingOptionsQueryKeys } from "./shipping-options"

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
  query?: Record<string, unknown>,
  options?: Omit<
    UseQueryOptions<{ draft_order: DraftOrderRecord }, FetchError, QueryKey>,
    "queryFn" | "queryKey"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () => sdk.admin.draftOrder.retrieve(id, query),
    queryKey: draftOrdersQueryKeys.detail(id, query),
    ...options,
  })

  return {
    ...data,
    ...rest,
    draft_order: data?.draft_order,
  }
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
      queryClient.invalidateQueries({
        queryKey: shippingOptionsQueryKeys.list(),
      })
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
  options?: UseMutationOptions<{ id: string }, FetchError, string>,
) => {
  return useMutation({
    mutationFn: (orderId) => sdk.admin.draftOrder.delete(orderId),
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

export const useDraftOrderAddItems = (
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
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.preview(id) })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/** @deprecated 使用 useDraftOrderAddItems */
export const useAddDraftOrderItems = useDraftOrderAddItems

export const useDraftOrderUpdateItem = (
  id: string,
  options?: UseMutationOptions<
    Record<string, unknown>,
    FetchError,
    { item_id: string; quantity?: number; unit_price?: number }
  >,
) => {
  return useMutation({
    mutationFn: ({ item_id, ...payload }) =>
      sdk.admin.draftOrder.updateItem(id, item_id, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.preview(id) })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDraftOrderRemoveActionItem = (
  id: string,
  options?: UseMutationOptions<Record<string, unknown>, FetchError, string>,
) => {
  return useMutation({
    mutationFn: (actionId) =>
      sdk.admin.draftOrder.removeActionItem(id, actionId),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.preview(id) })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/** @deprecated 使用 useDraftOrderRemoveActionItem */
export const useRemoveDraftOrderItem = useDraftOrderRemoveActionItem

export const useDraftOrderUpdateActionItem = (
  id: string,
  options?: UseMutationOptions<
    Record<string, unknown>,
    FetchError,
    { action_id: string; quantity?: number; unit_price?: number }
  >,
) => {
  return useMutation({
    mutationFn: ({ action_id, ...payload }) =>
      sdk.admin.draftOrder.updateActionItem(id, action_id, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.preview(id) })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDraftOrderAddPromotions = (
  id: string,
  options?: UseMutationOptions<
    Record<string, unknown>,
    FetchError,
    { promo_codes: string[] }
  >,
) => {
  return useMutation({
    mutationFn: (payload) => sdk.admin.draftOrder.addPromotions(id, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.preview(id) })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDraftOrderRemovePromotions = (
  id: string,
  options?: UseMutationOptions<
    Record<string, unknown>,
    FetchError,
    { promo_codes: string[] }
  >,
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.admin.draftOrder.removePromotions(id, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.preview(id) })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDraftOrderAddShippingMethod = (
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
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.preview(id) })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/** @deprecated 使用 useDraftOrderAddShippingMethod */
export const useAddDraftOrderShippingMethod = useDraftOrderAddShippingMethod

export const useDraftOrderUpdateActionShippingMethod = (
  id: string,
  options?: UseMutationOptions<
    Record<string, unknown>,
    FetchError,
    { action_id: string; amount?: number }
  >,
) => {
  return useMutation({
    mutationFn: ({ action_id, ...payload }) =>
      sdk.admin.draftOrder.updateActionShippingMethod(id, action_id, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.preview(id) })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDraftOrderRemoveActionShippingMethod = (
  id: string,
  options?: UseMutationOptions<Record<string, unknown>, FetchError, string>,
) => {
  return useMutation({
    mutationFn: (actionId) =>
      sdk.admin.draftOrder.removeActionShippingMethod(id, actionId),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.preview(id) })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDraftOrderRemoveShippingMethod = (
  id: string,
  options?: UseMutationOptions<Record<string, unknown>, FetchError, string>,
) => {
  return useMutation({
    mutationFn: (methodId) =>
      sdk.admin.draftOrder.removeShippingMethod(id, methodId),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.preview(id) })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/** @deprecated 使用 useDraftOrderRemoveShippingMethod */
export const useRemoveDraftOrderShippingMethod = useDraftOrderRemoveShippingMethod

export const useDraftOrderUpdateShippingMethod = (
  id: string,
  options?: UseMutationOptions<
    Record<string, unknown>,
    FetchError,
    { method_id: string; amount?: number }
  >,
) => {
  return useMutation({
    mutationFn: ({ method_id, ...payload }) =>
      sdk.admin.draftOrder.updateShippingMethod(id, method_id, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.preview(id) })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDraftOrderBeginEdit = (
  id: string,
  options?: UseMutationOptions<Record<string, unknown>, FetchError, void>,
) => {
  return useMutation({
    mutationFn: () => sdk.admin.draftOrder.beginEdit(id),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.preview(id) })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDraftOrderCancelEdit = (
  id: string,
  options?: UseMutationOptions<Record<string, unknown>, FetchError, void>,
) => {
  return useMutation({
    mutationFn: () => sdk.admin.draftOrder.cancelEdit(id),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.preview(id) })
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.details() })
      queryClient.invalidateQueries({ queryKey: draftOrdersQueryKeys.details() })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDraftOrderRequestEdit = (
  id: string,
  options?: UseMutationOptions<Record<string, unknown>, FetchError, void>,
) => {
  return useMutation({
    mutationFn: () => sdk.admin.draftOrder.requestEdit(id),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.preview(id) })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDraftOrderConfirmEdit = (
  id: string,
  options?: UseMutationOptions<Record<string, unknown>, FetchError, void>,
) => {
  return useMutation({
    mutationFn: () => sdk.admin.draftOrder.confirmEdit(id),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.preview(id) })
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.changes(id) })
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.details() })
      queryClient.invalidateQueries({ queryKey: draftOrdersQueryKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: draftOrdersQueryKeys.details() })
      queryClient.invalidateQueries({ queryKey: draftOrdersQueryKeys.lists() })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
