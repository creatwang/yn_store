import { defineMiddleware } from "astro:middleware"

const PROTECTED = ["/account", "/checkout"]
const NOINDEX = ["/cart", "/checkout", "/account", "/login", "/register"]

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url
  context.locals.noindex = NOINDEX.some((p) => pathname.startsWith(p))

  const needsAuth = PROTECTED.some((p) => pathname.startsWith(p))
  if (needsAuth) {
    const token = context.cookies.get("storefront_customer_token")?.value
    if (!token) {
      return context.redirect(
        `/login?redirect=${encodeURIComponent(pathname)}`,
      )
    }
    context.locals.customerToken = token
  }

  return next()
})
