// @ts-nocheck
import type { Locale } from "date-fns"
import enUS from "./translations/en.json"
import type { I18nNamespace, I18nTranslationValue } from "../dashboard-app/types"

const resources = {
  translation: enUS,
} as const

export type Resources = typeof resources
export type TranslationCatalog = typeof enUS
export type TranslationNamespace = I18nNamespace
export type TranslationValue = I18nTranslationValue

export type Language = {
  code: string
  display_name: string
  ltr: boolean
  date_locale: Locale
}
