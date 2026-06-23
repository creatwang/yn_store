import { storeClient } from "../api"

const CART_KEY = "storefront_cart_id"

export function getCartId(): string | null {
  if (typeof localStorage === "undefined") return null
  return localStorage.getItem(CART_KEY)
}

export function setCartId(id: string) {
  localStorage.setItem(CART_KEY, id)
}

export function clearCartId() {
  localStorage.removeItem(CART_KEY)
}

export async function apiFetch(path: string, init?: RequestInit) {
  const { authHeaders } = await import("./auth")
  return storeClient.fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...init?.headers,
    },
  })
}
