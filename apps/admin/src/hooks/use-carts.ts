import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, parseJsonResponse } from "@/lib/api"
import type {
  CreateCartInput,
  CreateCartLineItemInput,
  UpdateCartInput,
  UpdateCartLineItemInput,
} from "@my-store/validators"

export function useCart(id: string) {
  return useQuery({
    queryKey: ["cart", id],
    queryFn: async () => {
      const res = await api.store.carts[":id"].$get({ param: { id } })
      return parseJsonResponse(res)
    },
  })
}

export function useCreateCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateCartInput) => {
      const res = await api.store.carts.$post({ json: data })
      return parseJsonResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["carts"] })
    },
  })
}

export function useAddToCart(cartId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateCartLineItemInput) => {
      const res = await api.store.carts[":id"]["line-items"].$post({
        param: { id: cartId },
        json: data,
      })
      return parseJsonResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", cartId] })
    },
  })
}

export function useUpdateCartItem(cartId: string, itemId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateCartLineItemInput) => {
      const res = await api.store.carts[":id"]["line-items"][":line_id"].$post({
        param: { id: cartId, line_id: itemId },
        json: data,
      })
      return parseJsonResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", cartId] })
    },
  })
}

export function useRemoveCartItem(cartId: string, itemId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await api.store.carts[":id"]["line-items"][":line_id"].$delete({
        param: { id: cartId, line_id: itemId },
      })
      return parseJsonResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", cartId] })
    },
  })
}

export function useUpdateCart(cartId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateCartInput) => {
      const res = await api.store.carts[":id"].$post({ param: { id: cartId }, json: data })
      return parseJsonResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", cartId] })
    },
  })
}

export function useCompleteCheckout(cartId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await api.store.carts[":id"].complete.$post({ param: { id: cartId } })
      return parseJsonResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", cartId] })
      queryClient.invalidateQueries({ queryKey: ["orders"] })
    },
  })
}
