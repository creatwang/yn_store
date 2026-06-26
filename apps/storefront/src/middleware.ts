import { defineMiddleware } from "astro:middleware"

import { storeClient } from "./lib/api"

import {
  localeUrlPath,
  normalizeLocaleSegment,
  parseLocaleFromPathname,
  switchLocaleUrlPath,
} from "./lib/i18n"

import {
  buildLocaleSwitchOptions,
  fetchStoreLocaleSettings,
  isSupportedStoreLocale,
  resolveDefaultLocaleFromSettings,
} from "./lib/store-settings"

import {
  DEFAULT_CURRENCY,
  readCurrencyFromCookie,
  normalizeCurrencyCode,
} from "./lib/currency"

const PROTECTED = ["/account", "/checkout"]

const NOINDEX = ["/cart", "/checkout", "/account", "/login", "/register", "/auth"]

const SSR_REWRITE_PREFIXES = [
  "/cart",
  "/checkout",
  "/account",
  "/login",
  "/register",
  "/search",
  "/auth",
]

const CATALOG_PREFIXES = ["/products", "/collections", "/promotions"]

const LOCALE_BYPASS_PREFIXES = ["/api/", "/_astro/", "/sitemap"]

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url

  if (LOCALE_BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
    return next()
  }

  const localeSettings = await fetchStoreLocaleSettings()
  const storeDefaultLocale = resolveDefaultLocaleFromSettings(localeSettings)
  context.locals.storeLocaleOptions = buildLocaleSwitchOptions(localeSettings)
  context.locals.storeDefaultLocale = storeDefaultLocale

  const { locale, pathnameWithoutLocale, urlSegment } = parseLocaleFromPathname(
    pathname,
    storeDefaultLocale,
  )
  context.locals.locale = locale
  storeClient.syncLocaleFromPathname(pathname)

  const cookieCurrency = readCurrencyFromCookie(context.request.headers.get("cookie"))
  const envDefault =
    import.meta.env.PUBLIC_DEFAULT_CURRENCY ||
    (typeof process !== "undefined" ? process.env.PUBLIC_DEFAULT_CURRENCY : undefined)
  const currency = normalizeCurrencyCode(cookieCurrency || envDefault)
  context.locals.currency = currency
  storeClient.setCurrency(currency)

  const routedPath =
    pathnameWithoutLocale !== pathname ? pathnameWithoutLocale : pathname

  const hasLocalePrefix = pathnameWithoutLocale !== pathname

  if (!hasLocalePrefix && pathname === "/") {
    return context.redirect(localeUrlPath(storeDefaultLocale, "/"))
  }

  if (
    !hasLocalePrefix &&
    CATALOG_PREFIXES.some((p) => routedPath === p || routedPath.startsWith(`${p}/`))
  ) {
    return context.redirect(
      localeUrlPath(storeDefaultLocale, routedPath + context.url.search),
    )
  }

  if (
    hasLocalePrefix &&
    urlSegment &&
    !isSupportedStoreLocale(locale, localeSettings)
  ) {
    return context.redirect(
      switchLocaleUrlPath(pathname, storeDefaultLocale),
    )
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
