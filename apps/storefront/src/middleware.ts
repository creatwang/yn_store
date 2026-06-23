import { defineMiddleware } from "astro:middleware"

import { storeClient } from "./lib/api/index"

import {

  DEFAULT_LOCALE,

  localeUrlPath,

  normalizeLocaleSegment,

  parseLocaleFromPathname,

} from "./lib/i18n"



const PROTECTED = ["/account", "/checkout"]

const NOINDEX = ["/cart", "/checkout", "/account", "/login", "/register", "/auth"]



/** 仍走 rewrite 的 SSR 路由（无 [locale] 物理页面） */

const SSR_REWRITE_PREFIXES = [

  "/cart",

  "/checkout",

  "/account",

  "/login",

  "/register",

  "/search",

  "/auth",

]



/** 无前缀访问时应重定向到默认语言前缀的 catalog 路由 */

const CATALOG_PREFIXES = ["/products", "/collections", "/promotions"]



/** 不参与 locale 解析的路径 */

const LOCALE_BYPASS_PREFIXES = ["/api/", "/_astro/", "/sitemap"]



export const onRequest = defineMiddleware(async (context, next) => {

  const { pathname } = context.url



  if (LOCALE_BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {

    return next()

  }



  const { locale, pathnameWithoutLocale, urlSegment } = parseLocaleFromPathname(pathname)

  context.locals.locale = locale

  storeClient.syncLocaleFromPathname(pathname)



  const routedPath =

    pathnameWithoutLocale !== pathname ? pathnameWithoutLocale : pathname



  const hasLocalePrefix = pathnameWithoutLocale !== pathname



  if (!hasLocalePrefix && pathname === "/") {

    return context.redirect(localeUrlPath(DEFAULT_LOCALE, "/"))

  }



  if (

    !hasLocalePrefix &&

    CATALOG_PREFIXES.some((p) => routedPath === p || routedPath.startsWith(`${p}/`))

  ) {

    return context.redirect(localeUrlPath(DEFAULT_LOCALE, routedPath + context.url.search))

  }



  context.locals.noindex = NOINDEX.some((p) => routedPath.startsWith(p))



  const needsAuth = PROTECTED.some((p) => routedPath.startsWith(p))

  if (needsAuth) {

    const token = context.cookies.get("storefront_customer_token")?.value

    if (!token) {

      const loginPath = localeUrlPath(locale, `/login?redirect=${encodeURIComponent(pathname)}`)

      return context.redirect(loginPath)

    }

    context.locals.customerToken = token

  }



  const needsRewrite =

    hasLocalePrefix &&

    SSR_REWRITE_PREFIXES.some((p) => routedPath === p || routedPath.startsWith(`${p}/`))



  if (needsRewrite) {

    const rewriteUrl = new URL(pathnameWithoutLocale + context.url.search, context.url.origin)

    const response = await context.rewrite(rewriteUrl)

    response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups")

    return response

  }



  if (hasLocalePrefix && urlSegment) {

    const normalized = normalizeLocaleSegment(urlSegment)

    if (normalized) {

      context.locals.locale = normalized

      storeClient.setLocale(normalized)

    }

  }



  const response = await next()

  response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups")

  return response

})


