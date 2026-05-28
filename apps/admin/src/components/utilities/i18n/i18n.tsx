import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"

import { defaultI18nOptions } from "../../../i18n/config"
import { useExtension } from "../../../providers/extension-provider"

const normalizeLanguageCode = (detected: string = "") => {
  const normalized = detected.trim().toLowerCase()
  const alias: Record<string, string> = {
    "zh-cn": "zhCN",
    "zh-hans": "zhCN",
    "zh-tw": "zhTW",
    "zh-hant": "zhTW",
    "en-gb": "enGB",
    "pt-br": "ptBR",
    "pt-pt": "ptPT",
    "fa-ir": "fa",
  }

  return alias[normalized] ?? detected
}

export const I18n = () => {
  const { getI18nResources } = useExtension()

  if (i18n.isInitialized) {
    return null
  }

  const resources = getI18nResources()
  i18n
    .use(
      new LanguageDetector(null, {
        lookupCookie: "lng",
        lookupLocalStorage: "lng",
        convertDetectedLanguage: normalizeLanguageCode,
      })
    )
    .use(initReactI18next)
    .init({
      ...defaultI18nOptions,
      resources,
      supportedLngs: Object.keys(resources),
    })

  return null
}

export { i18n }
