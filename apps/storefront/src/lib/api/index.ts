import {
  DEFAULT_LOCALE,
  localeUrlPath,
  parseLocaleFromPathname,
  type StoreLocale,
} from "../i18n"

const LOCALE_STORAGE_KEY = "store_locale"

/** Store API 请求头：语言（与 Medusa 无关的项目自有命名） */
export const STORE_LOCALE_HEADER = "x-store-locale"

const API_BASE =
  (typeof process !== "undefined" ? process.env.PUBLIC_API_URL : undefined) ||
  import.meta.env.PUBLIC_API_URL ||
  "http://localhost:7000"

export function getSalesChannelId(): string | undefined {
  return (
    (typeof process !== "undefined" ? process.env.PUBLIC_SALES_CHANNEL_ID : undefined) ||
    import.meta.env.PUBLIC_SALES_CHANNEL_ID ||
    undefined
  )
}

function readPersistedLocale(): StoreLocale | undefined {
  if (typeof document === "undefined") {
    return (
      (typeof process !== "undefined" ? process.env.PUBLIC_STORE_LOCALE : undefined) ||
      import.meta.env.PUBLIC_STORE_LOCALE ||
      undefined
    ) as StoreLocale | undefined
  }
  const stored =
    localStorage.getItem(LOCALE_STORAGE_KEY) ||
    document.cookie.match(/(?:^|;\s*)locale=([^;]+)/)?.[1]
  if (!stored) return undefined
  const { locale } = parseLocaleFromPathname(`/${stored}`)
  return locale
}

function persistLocale(locale: string) {
  if (typeof document === "undefined") {
    return
  }
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  document.cookie = `locale=${encodeURIComponent(locale)}; path=/; max-age=31536000; samesite=lax`
}

/**
 * Storefront Store API 客户端。
 * locale 由 URL 路径首段驱动（见 middleware + syncLocaleFromPathname）。
 */
export class StoreApiClient {
  private locale: StoreLocale = DEFAULT_LOCALE

  constructor(initialLocale?: string) {
    if (initialLocale) {
      this.setLocale(initialLocale)
    } else {
      const persisted = readPersistedLocale()
      this.locale = persisted ?? DEFAULT_LOCALE
    }
  }

  /** 设置后续 Store API 请求的 locale */
  setLocale(locale: string) {
    const { locale: normalized } = parseLocaleFromPathname(
      locale.includes("/") ? locale : `/${locale}`,
    )
    this.locale = normalized
    persistLocale(normalized)
  }

  /** 从当前 URL pathname 解析并设置 locale */
  syncLocaleFromPathname(pathname: string) {
    const { locale } = parseLocaleFromPathname(pathname)
    this.locale = locale
    persistLocale(locale)
    return locale
  }

  getLocale(): StoreLocale {
    return this.locale
  }

  storeApiUrl(path: string): string {
    const p = path.startsWith("/") ? path : `/${path}`
    return `${API_BASE}/api${p}`
  }

  buildHeaders(init?: RequestInit): Record<string, string> {
    const headers: Record<string, string> = {
      ...(init?.headers as Record<string, string> | undefined),
    }
    const sc = getSalesChannelId()
    if (sc) {
      headers["X-Sales-Channel"] = sc
    }
    if (this.locale) {
      headers[STORE_LOCALE_HEADER] = this.locale
    }
    return headers
  }

  async fetch(path: string, init?: RequestInit): Promise<Response> {
    const headers = this.buildHeaders(init)
    return fetch(this.storeApiUrl(path), { ...init, headers })
  }

  async fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.fetch(path, init)
    if (!res.ok) {
      throw new Error(`Store API ${res.status}: ${path}`)
    }
    return res.json() as Promise<T>
  }

  async fetchAllPaginated<T>(
    path: string,
    key: string,
    limit = 100,
  ): Promise<T[]> {
    const all: T[] = []
    let offset = 0

    for (;;) {
      const sep = path.includes("?") ? "&" : "?"
      const body = await this.fetchJson<Record<string, unknown>>(
        `${path}${sep}limit=${limit}&offset=${offset}`,
      )
      const batch = (body[key] ?? []) as T[]
      all.push(...batch)
      if (batch.length < limit) break
      offset += limit
    }

    return all
  }
}

/** 默认单例 — storefront 全局使用 */
export const storeClient = new StoreApiClient()

/** 兼容旧 API */
export const storeApiUrl = (path: string) => storeClient.storeApiUrl(path)
export const fetchStoreJson = <T>(path: string, init?: RequestInit) =>
  storeClient.fetchJson<T>(path, init)
export const fetchAllPaginated = <T>(path: string, key: string, limit?: number) =>
  storeClient.fetchAllPaginated<T>(path, key, limit)

export { localeUrlPath, parseLocaleFromPathname, DEFAULT_LOCALE }
