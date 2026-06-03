import type { APIRoute } from "astro"

export const prerender = false

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const contentType = request.headers.get("content-type") || ""
  if (
    !contentType.includes("application/x-www-form-urlencoded") &&
    !contentType.includes("multipart/form-data")
  ) {
    return redirect("/login?error=google_bad_request")
  }

  const form = await request.formData()
  const credential = String(form.get("credential") ?? "")
  const csrfBody = String(form.get("g_csrf_token") ?? "")
  const csrfCookie = cookies.get("g_csrf_token")?.value

  if (!credential || !csrfBody || csrfBody !== csrfCookie) {
    return redirect("/login?error=google_csrf")
  }

  const apiUrl = import.meta.env.PUBLIC_API_URL || "http://localhost:7000"
  const res = await fetch(`${apiUrl}/api/auth/customer/google/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  })

  if (!res.ok) {
    return redirect("/login?error=google_auth_failed")
  }

  const data = await res.json()
  const token = data.token as string | undefined
  const customer = data.customer
  if (!token || !customer) {
    return redirect("/login?error=google_no_token")
  }

  cookies.set("storefront_customer_token", token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 24 * 7,
  })

  cookies.set("storefront_customer_pending", JSON.stringify(customer), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    maxAge: 60,
  })

  return redirect("/auth/google/complete")
}
