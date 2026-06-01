import type { APIRoute } from "astro"

export const prerender = false

export const POST: APIRoute = async ({ request, cookies }) => {
  let token: string | undefined
  try {
    const body = await request.json()
    token = body.token
  } catch {
    return new Response(JSON.stringify({ error: "invalid body" }), {
      status: 400,
    })
  }

  if (!token || typeof token !== "string") {
    return new Response(JSON.stringify({ error: "token required" }), {
      status: 400,
    })
  }

  cookies.set("storefront_customer_token", token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 24 * 7,
  })

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

export const DELETE: APIRoute = async ({ cookies }) => {
  cookies.delete("storefront_customer_token", { path: "/" })
  return new Response(JSON.stringify({ ok: true }))
}
