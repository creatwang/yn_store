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
  const apiUrl = import.meta.env.PUBLIC_API_URL || "http://localhost:9000"
  const res = await fetch(`${apiUrl}/api${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  })
  return res
}
