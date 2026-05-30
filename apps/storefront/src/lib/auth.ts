const TOKEN_KEY = "storefront_customer_token"
const CUSTOMER_KEY = "storefront_customer"

export type StoreCustomer = {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
}

export function getCustomerToken(): string | null {
  if (typeof localStorage === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getCustomer(): StoreCustomer | null {
  if (typeof localStorage === "undefined") return null
  const raw = localStorage.getItem(CUSTOMER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoreCustomer
  } catch {
    return null
  }
}

export function setCustomerSession(token: string, customer: StoreCustomer) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer))
}

export function clearCustomerSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(CUSTOMER_KEY)
}

export function authHeaders(): Record<string, string> {
  const token = getCustomerToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function loginCustomer(email: string, password: string) {
  const apiUrl = import.meta.env.PUBLIC_API_URL || "http://localhost:9000"
  const res = await fetch(`${apiUrl}/api/auth/customer/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || "登录失败")
  }
  const data = await res.json()
  setCustomerSession(data.token, data.customer)
  return data
}

export async function registerCustomer(payload: {
  email: string
  password: string
  first_name?: string
  last_name?: string
}) {
  const apiUrl = import.meta.env.PUBLIC_API_URL || "http://localhost:9000"
  const res = await fetch(`${apiUrl}/api/store/customers/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || "注册失败")
  }
  return loginCustomer(payload.email, payload.password)
}

export async function linkCartToCustomer(cartId: string) {
  const customer = getCustomer()
  if (!customer) return
  const { apiFetch } = await import("./cart")
  await apiFetch(`/store/carts/${cartId}`, {
    method: "POST",
    body: JSON.stringify({ customer_id: customer.id, email: customer.email }),
  })
}
