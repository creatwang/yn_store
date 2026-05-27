import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { CreateCartInput, AddToCartInput, UpdateCartInput, UpdateCartItemInput } from "@my-store/validators"

export function useCart(id: string) {
  return useQuery({
    queryKey: ["cart", id],
    queryFn: async () => {
      const res = await api.store.carts[":id"].$get({ param: { id } })
      return await res.json()
    },
  })
}

export function useCreateCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateCartInput) => {
      const res = await api.store.carts.$post({ json: data })
      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["carts"] })
    },
  })
}

export function useAddToCart(cartId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: AddToCartInput) => {
      const res = await api.store.carts[":id"].items.$post({ param: { id: cartId }, json: data })
      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", cartId] })
    },
  })
}

export function useUpdateCartItem(cartId: string, itemId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateCartItemInput) => {
      const res = await api.store.carts[":id"].items[":item_id"].$post({ 
        param: { id: cartId, item_id: itemId }, 
        json: data 
      })
      return await res.json()
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
      const res = await api.store.carts[":id"].items[":item_id"].$delete({ 
        param: { id: cartId, item_id: itemId } 
      })
      return await res.json()
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
      return await res.json()
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
      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", cartId] })
      queryClient.invalidateQueries({ queryKey: ["orders"] })
    },
  })
}