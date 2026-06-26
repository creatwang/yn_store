import { DEFAULT_LOCALE } from "./i18n/locale"

const API_BASE =
  (typeof process !== "undefined" ? process.env.PUBLIC_API_URL : undefined) ||
  import.meta.env.PUBLIC_API_URL ||
  "http://localhost:7000"

export type StoreLocaleOption = {
  locale: string
  label: string
}

export type StoreLocaleSettings = {
  default_locale_code: string | null
  locales: Array<{ code: string; name: string }>
}

let cached: { value: StoreLocaleSettings; expiresAt: number } | undefined

const CACHE_MS = 60_000

const SHORT_LABELS: Record<string, string> = {
  "zh-CN": "中文",
  "zh-TW": "繁中",
  "en-US": "EN",
  "en-GB": "EN-GB",
  "ja-JP": "JA",
  "ko-KR": "KO",
  "fr-FR": "FR",
  "de-DE": "DE",
  "es-ES": "ES",
}

function localeSwitchLabel(code: string, name?: string): string {
  return SHORT_LABELS[code] ?? name ?? code
}

function normalizeSettings(data: {
  default_locale_code?: string | null
  locales?: Array<{ code?: string; name?: string }>
}): StoreLocaleSettings {
  const locales = (data.locales ?? [])
    .map((item) => ({
      code: item.code?.trim() ?? "",
      name: item.name?.trim() ?? item.code?.trim() ?? "",
    }))
    .filter((item) => item.code.length > 0)

  return {
    default_locale_code: data.default_locale_code?.trim() || null,
    locales,
  }
}

export async function fetchStoreLocaleSettings(): Promise<StoreLocaleSettings> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  try {
    const res = await fetch(`${API_BASE}/api/store/locales`, {
      headers: { accept: "application/json" },
    })
    if (!res.ok) {
      throw new Error(`store locales ${res.status}`)
    }
    const data = (await res.json()) as {
      default_locale_code?: string | null
      locales?: Array<{ code?: string; name?: string }>
    }
    const value = normalizeSettings(data)
    cached = { value, expiresAt: Date.now() + CACHE_MS }
    return value
  } catch {
    return { default_locale_code: null, locales: [] }
  }
}

export function buildLocaleSwitchOptions(
  settings: StoreLocaleSettings,
): StoreLocaleOption[] {
  return settings.locales.map((item) => ({
    locale: item.code,
    label: localeSwitchLabel(item.code, item.name),
  }))
}

export function resolveDefaultLocaleFromSettings(
  settings: StoreLocaleSettings,
): string {
  const configured = settings.default_locale_code
  if (
    configured &&
    settings.locales.some(
      (l) => l.code.toLowerCase() === configured.toLowerCase(),
    )
  ) {
    return configured
  }
  if (settings.locales[0]?.code) {
    return settings.locales[0].code
  }
  return DEFAULT_LOCALE
}

export function isSupportedStoreLocale(
  code: string,
  settings: StoreLocaleSettings,
): boolean {
  if (!settings.locales.length) {
    return true
  }
  const normalized = code.toLowerCase()
  return settings.locales.some((l) => l.code.toLowerCase() === normalized)
}

export async function resolveStorefrontDefaultLocale(): Promise<string> {
  const settings = await fetchStoreLocaleSettings()
  return resolveDefaultLocaleFromSettings(settings)
}

export async function fetchStoreSsgLocales(): Promise<string[]> {
  const settings = await fetchStoreLocaleSettings()
  if (settings.locales.length) {
    return settings.locales.map((l) => l.code)
  }
  return [DEFAULT_LOCALE]
}
