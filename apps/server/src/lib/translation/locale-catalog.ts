/** IETF BCP 47 常用 locale 目录（Admin 选语言 / GET /admin/locales） */
const LOCALE_NAMES: Record<string, string> = {
  "zh-CN": "Chinese (Simplified)",
  "zh-TW": "Chinese (Traditional)",
  "en-US": "English (United States)",
  "en-GB": "English (United Kingdom)",
  "ja-JP": "Japanese",
  "ko-KR": "Korean",
  "fr-FR": "French",
  "de-DE": "German",
  "es-ES": "Spanish",
  "pt-BR": "Portuguese (Brazil)",
  "pt-PT": "Portuguese (Portugal)",
  "it-IT": "Italian",
  "ru-RU": "Russian",
  "ar-SA": "Arabic",
  "th-TH": "Thai",
  "vi-VN": "Vietnamese",
  "id-ID": "Indonesian",
  "nl-NL": "Dutch",
  "pl-PL": "Polish",
  "tr-TR": "Turkish",
}

export const LOCALE_CATALOG = Object.keys(LOCALE_NAMES)

/** Store API 语言请求头（项目自有，非 Medusa 命名） */
export const STORE_LOCALE_HEADER = "x-store-locale"

export function getLocaleName(code: string): string {
  return LOCALE_NAMES[code] ?? code
}

export function toAdminLocale(code: string) {
  return { code, name: getLocaleName(code) }
}

export function resolveRequestLocale(
  headerLocale?: string | null,
  queryLocale?: string | null,
): string | undefined {
  const raw = (headerLocale ?? queryLocale)?.trim()
  return raw || undefined
}