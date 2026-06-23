/** 与 server lib/translation/locale-catalog 对齐的可识别语言 */
export const LOCALE_CATALOG = [
  "zh-CN",
  "zh-TW",
  "en-US",
  "en-GB",
  "ja-JP",
  "ko-KR",
  "fr-FR",
  "de-DE",
  "es-ES",
] as const

export type StoreLocale = (typeof LOCALE_CATALOG)[number]

export const DEFAULT_LOCALE: StoreLocale =
  (import.meta.env.PUBLIC_DEFAULT_LOCALE as StoreLocale | undefined) ?? "zh-CN"

/** 顶栏语言切换选项 */
export const LOCALE_SWITCH_OPTIONS: Array<{ locale: StoreLocale; label: string }> = [
  { locale: "zh-CN", label: "中文" },
  { locale: "en-US", label: "EN" },
]

/** URL 首段 → IETF locale（如 /en/products → en-US） */
const SEGMENT_TO_LOCALE: Record<string, StoreLocale> = {
  en: "en-US",
  "en-us": "en-US",
  "en-gb": "en-GB",
  zh: "zh-CN",
  "zh-cn": "zh-CN",
  "zh-tw": "zh-TW",
  ja: "ja-JP",
  "ja-jp": "ja-JP",
  ko: "ko-KR",
  "ko-kr": "ko-KR",
  fr: "fr-FR",
  de: "de-DE",
  es: "es-ES",
}

/** IETF locale → URL 首段 */
const LOCALE_TO_SEGMENT: Partial<Record<StoreLocale, string>> = {
  "en-US": "en",
  "en-GB": "en-gb",
  "zh-CN": "zh",
  "zh-TW": "zh-tw",
  "ja-JP": "ja",
  "ko-KR": "ko",
  "fr-FR": "fr",
  "de-DE": "de",
  "es-ES": "es",
}

export function normalizeLocaleSegment(segment: string): StoreLocale | undefined {
  const trimmed = segment.trim()
  if (!trimmed) return undefined
  if ((LOCALE_CATALOG as readonly string[]).includes(trimmed)) {
    return trimmed as StoreLocale
  }
  const alias = SEGMENT_TO_LOCALE[trimmed.toLowerCase()]
  if (alias) return alias
  const byCase = LOCALE_CATALOG.find((c) => c.toLowerCase() === trimmed.toLowerCase())
  return byCase
}

export function localeToUrlSegment(locale: string): string {
  return LOCALE_TO_SEGMENT[locale as StoreLocale] ?? locale.toLowerCase()
}

export function parseLocaleFromPathname(pathname: string): {
  locale: StoreLocale
  pathnameWithoutLocale: string
  urlSegment?: string
} {
  const parts = pathname.split("/").filter(Boolean)
  if (parts.length === 0) {
    return { locale: DEFAULT_LOCALE, pathnameWithoutLocale: "/" }
  }

  const normalized = normalizeLocaleSegment(parts[0]!)
  if (!normalized) {
    return { locale: DEFAULT_LOCALE, pathnameWithoutLocale: pathname }
  }

  const rest = parts.slice(1)
  return {
    locale: normalized,
    urlSegment: parts[0],
    pathnameWithoutLocale: rest.length ? `/${rest.join("/")}` : "/",
  }
}

/** 为站内路径加上语言前缀，如 localeUrlPath("en-US", "/products/a") → /en/products/a */
export function localeUrlPath(locale: string, path = "/"): string {
  const [rawPath, ...queryParts] = path.split("?")
  const normalized = rawPath.startsWith("/") ? rawPath : `/${rawPath}`
  const query = queryParts.length ? `?${queryParts.join("?")}` : ""
  const segment = localeToUrlSegment(locale)
  if (normalized === "/") {
    return `/${segment}${query}`
  }
  return `/${segment}${normalized}${query}`
}

/** 保持当前页面路径，仅切换语言前缀 */
export function switchLocaleUrlPath(pathname: string, targetLocale: StoreLocale): string {
  const { pathnameWithoutLocale } = parseLocaleFromPathname(pathname)
  const searchStart = pathname.indexOf("?")
  const query = searchStart >= 0 ? pathname.slice(searchStart) : ""
  return localeUrlPath(targetLocale, `${pathnameWithoutLocale}${query}`)
}
