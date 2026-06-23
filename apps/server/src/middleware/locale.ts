import type { MiddlewareHandler } from "hono"
import { STORE_LOCALE_HEADER, resolveRequestLocale } from "../lib/translation"

export type LocaleVariables = {
  locale?: string
}

/** 解析 Store API locale：X-Store-Locale 优先于 ?locale= */
export const localeMiddleware: MiddlewareHandler<{ Variables: LocaleVariables }> = async (
  c,
  next,
) => {
  const headerLocale = c.req.header(STORE_LOCALE_HEADER)
  const queryLocale = c.req.query("locale")
  const locale = resolveRequestLocale(headerLocale, queryLocale)
  if (locale) {
    c.set("locale", locale)
  }
  await next()
}
