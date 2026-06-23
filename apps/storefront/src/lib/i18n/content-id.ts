import type { StoreLocale } from "./locale"

const SEP = "::"

/** Content Collection entry id：zh-CN::product-handle */
export function contentEntryId(locale: StoreLocale | string, handle: string): string {
  return `${locale}${SEP}${handle}`
}

export function parseContentEntryId(id: string): { locale: string; handle: string } | null {
  const idx = id.indexOf(SEP)
  if (idx <= 0) return null
  return {
    locale: id.slice(0, idx),
    handle: id.slice(idx + SEP.length),
  }
}
