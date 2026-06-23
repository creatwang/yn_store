// @ts-nocheck
import { useMutation, UseMutationOptions } from "@tanstack/react-query"

import { HttpTypes } from "@medusajs/types"

import { sdk } from "../../lib/api/client"
import { queryClient } from "../../lib/query/query-client"
import { ordersQueryKeys } from "./orders"
import { FetchError } from "@medusajs/js-sdk"
import { reservationItemsQueryKeys } from "./reservations"
import { inventoryItemsQueryKeys } from "./inventory.tsx"

function invalidateOrderEditQueries(orderId: string) {
  queryClient.invalidateQueries({
    queryKey: ordersQueryKeys.details(),
  })
  queryClient.invalidateQueries({
    queryKey: ordersQueryKeys.preview(orderId),
  })
  queryClient.invalidateQueries({
    queryKey: ordersQueryKeys.changes(orderId),
  })
  queryClient.invalidateQueries({
    queryKey: ordersQueryKeys.lineItems(orderId),
  })
}

export const useCreateOrderEdit = (
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderEditResponse,
    FetchError,
    HttpTypes.AdminInitiateOrderEditRequest
  >
) => {
  return useMutation({
    mutationFn: (payload: HttpTypes.AdminInitiateOrderEditRequest) =>
      sdk.admin.orderEdit.initiateRequest(payload),
    onSuccess: (data: any, variables: any, context: any) => {
      invalidateOrderEditQueries(orderId)
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export type RequestOrderEditInput = {
  internal_note?: string
  send_notification?: boolean
}

export const useRequestOrderEdit = (
  editId: string,
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderEditPreviewResponse,
    FetchError,
    RequestOrderEditInput | void
  >
) => {
  return useMutation({
    mutationFn: (payload?: RequestOrderEditInput) =>
      sdk.admin.orderEdit.request(editId, payload ?? {}),
    onSuccess: (data: any, variables: any, context: any) => {
      invalidateOrderEditQueries(orderId)
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useConfirmOrderEdit = (
  editId: string,
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderEditPreviewResponse,
    FetchError,
    void
  >
) => {
  return useMutation({
    mutationFn: () => sdk.admin.orderEdit.confirm(editId),
    onSuccess: (data: any, variables: any, context: any) => {
      invalidateOrderEditQueries(orderId)
      queryClient.invalidateQueries({
        queryKey: reservationItemsQueryKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: inventoryItemsQueryKeys.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useCancelOrderEdit = (
  editId: string,
  orderId: string,
  options?: UseMutationOptions<any, FetchError, void>
) => {
  return useMutation({
    mutationFn: () => sdk.admin.orderEdit.cancelRequest(editId),
    onSuccess: (data: any, variables: any, context: any) => {
      invalidateOrderEditQueries(orderId)
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useAddOrderEditItems = (
  editId: string,
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderEditPreviewResponse,
    FetchError,
    HttpTypes.AdminAddOrderEditItems
  >
) => {
  return useMutation({
    mutationFn: (payload: HttpTypes.AdminAddOrderEditItems) =>
      sdk.admin.orderEdit.addItems(editId, payload),
    onSuccess: (data: any, variables: any, context: any) => {
      if (data?.order) {
        queryClient.setQueryData(ordersQueryKeys.preview(orderId), data)
      }
      invalidateOrderEditQueries(orderId)
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/**
 * Update (quantity) of an item that was originally on the order.
 */
export const useUpdateOrderEditOriginalItem = (
  editId: string,
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderEditPreviewResponse,
    FetchError,
    HttpTypes.AdminUpdateOrderEditItem & { itemId: string }
  >
) => {
  return useMutation({
    mutationFn: ({
      itemId,
      ...payload
    }: HttpTypes.AdminUpdateOrderEditItem & { itemId: string }) => {
      return sdk.admin.orderEdit.updateOriginalItem(editId, itemId, payload)
    },
    onSuccess: (data: any, variables: any, context: any) => {
      invalidateOrderEditQueries(orderId)
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/**
 * Update (quantity) of an item that was added to the order edit.
 */
export const useUpdateOrderEditAddedItem = (
  editId: string,
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderEditPreviewResponse,
    FetchError,
    HttpTypes.AdminUpdateOrderEditItem & { actionId: string }
  >
) => {
  return useMutation({
    mutationFn: ({
      actionId,
      ...payload
    }: HttpTypes.AdminUpdateOrderEditItem & { actionId: string }) => {
      return sdk.admin.orderEdit.updateAddedItem(editId, actionId, payload)
    },
    onSuccess: (data: any, variables: any, context: any) => {
      invalidateOrderEditQueries(orderId)
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/**
 * Remove item that was added to the edit.
 * To remove an original item on the order, set quantity to 0.
 */
export const useRemoveOrderEditItem = (
  editId: string,
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderEditPreviewResponse,
    FetchError,
    string
  >
) => {
  return useMutation({
    mutationFn: (actionId: string) =>
      sdk.admin.orderEdit.removeAddedItem(editId, actionId),
    onSuccess: (data: any, variables: any, context: any) => {
      invalidateOrderEditQueries(orderId)
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
