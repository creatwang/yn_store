import { DEFAULT_LOCALE, LOCALE_SWITCH_OPTIONS, localeToUrlSegment } from "./locale"
import { fetchStoreSsgLocales } from "../store-settings"

/** SSG build 时要预渲染的语言（优先读 Admin 商店语言，其次 env，最后本地 fallback） */
export async function getSsgLocalesAsync(): Promise<string[]> {
  const envRaw =
    (typeof process !== "undefined" ? process.env.PUBLIC_SSG_LOCALES : undefined) ||
    import.meta.env.PUBLIC_SSG_LOCALES

  if (envRaw?.trim()) {
    const parsed = envRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    if (parsed.length) return parsed
  }

  try {
    return await fetchStoreSsgLocales()
  } catch {
    return getSsgLocales()
  }
}

/** 同步 fallback（无 API 或 build 脚本未拉取后台时使用） */
export function getSsgLocales(): string[] {
  const raw =
    (typeof process !== "undefined" ? process.env.PUBLIC_SSG_LOCALES : undefined) ||
    import.meta.env.PUBLIC_SSG_LOCALES

  if (raw?.trim()) {
    const parsed = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    if (parsed.length) return parsed
  }

  return LOCALE_SWITCH_OPTIONS.map((o) => o.locale)
}

export function isStaticContentMode(): boolean {
  const astroOutput =
    (typeof process !== "undefined" ? process.env.ASTRO_OUTPUT : undefined) ||
    import.meta.env.ASTRO_OUTPUT ||
    "server"
  return astroOutput === "static" && import.meta.env.PROD
}

export function localeSegmentForBuild(locale: string): string {
  return localeToUrlSegment(locale)
}

export async function resolvePageLocale(
  localeParam: string | undefined,
  supportedLocales?: string[],
): Promise<string> {
  if (!localeParam) {
    return supportedLocales?.[0] ?? DEFAULT_LOCALE
  }

  const segment = localeParam.trim().toLowerCase()
  const supported = supportedLocales?.length
    ? supportedLocales
    : await getSsgLocalesAsync()

  const matched = supported.find(
    (code) => localeToUrlSegment(code).toLowerCase() === segment,
  )
  return matched ?? supported[0] ?? DEFAULT_LOCALE
}
