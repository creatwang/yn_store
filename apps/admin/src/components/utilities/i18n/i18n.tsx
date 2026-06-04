import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { PropsWithChildren, useEffect, useState } from "react"
import { initReactI18next } from "react-i18next"
import { Spinner } from "@medusajs/icons"

import { defaultI18nOptions } from "../../../i18n/config"
import { bindMedusaPluralLocales } from "../../../i18n/medusa-plural-locales"
import { useExtension } from "../../../providers/extension-provider"

const normalizeLanguageCode = (detected: string = "") => {
  const normalized = detected.trim().toLowerCase()
  const alias: Record<string, string> = {
    zh: "zhCN",
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

function I18nLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="text-ui-fg-interactive animate-spin" />
    </div>
  )
}

export const I18n = ({ children }: PropsWithChildren) => {
  const { getI18nResources } = useExtension()
  const [isReady, setIsReady] = useState(i18n.isInitialized)

  useEffect(() => {
    if (i18n.isInitialized) {
      setIsReady(true)
      return
    }

    const resources = getI18nResources()
    void i18n
      .use(
        new LanguageDetector(null, {
          lookupCookie: "lng",
          lookupLocalStorage: "lng",
          convertDetectedLanguage: normalizeLanguageCode,
        }),
      )
      .use(initReactI18next)
      .init(
        {
          ...defaultI18nOptions,
          resources,
          supportedLngs: Object.keys(resources),
        },
        () => {
          bindMedusaPluralLocales(i18n)
          setIsReady(true)
        },
      )
  }, [getI18nResources])

  if (!isReady) {
    return <I18nLoading />
  }

  return children
}

export { i18n }
