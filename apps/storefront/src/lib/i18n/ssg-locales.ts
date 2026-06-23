import {
  DEFAULT_LOCALE,
  LOCALE_SWITCH_OPTIONS,
  localeToUrlSegment,
  type StoreLocale,
} from "./locale"

/** SSG build 时要预渲染的语言（逗号分隔 env，默认与顶栏切换一致） */
export function getSsgLocales(): StoreLocale[] {
  const raw =
    (typeof process !== "undefined" ? process.env.PUBLIC_SSG_LOCALES : undefined) ||
    import.meta.env.PUBLIC_SSG_LOCALES

  if (raw?.trim()) {
    const parsed = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) as StoreLocale[]
    if (parsed.length) return parsed
  }

  return LOCALE_SWITCH_OPTIONS.map((o) => o.locale)
}

/** Content Loader 是否在产线 static build 中启用 */
export function isStaticContentMode(): boolean {
  const astroOutput =
    (typeof process !== "undefined" ? process.env.ASTRO_OUTPUT : undefined) ||
    import.meta.env.ASTRO_OUTPUT ||
    "server"
  return astroOutput === "static" && import.meta.env.PROD
}

export function localeSegmentForBuild(locale: StoreLocale): string {
  return localeToUrlSegment(locale)
}

export function resolvePageLocale(localeParam: string | undefined): StoreLocale {
  if (!localeParam) return DEFAULT_LOCALE
  const segment = localeParam.trim().toLowerCase()
  const fromSwitch = LOCALE_SWITCH_OPTIONS.find(
    (o) => localeToUrlSegment(o.locale).toLowerCase() === segment,
  )
  return fromSwitch?.locale ?? DEFAULT_LOCALE
}
