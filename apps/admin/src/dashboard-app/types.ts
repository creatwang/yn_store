export type I18nNamespace = Record<string, string | Record<string, string>>
export type I18nTranslationValue = string | { [key: string]: I18nTranslationValue }
export type I18nExtension = Record<string, { translation: I18nTranslationValue }>

export type DashboardPlugin = any

export type CustomFieldModel = string

export type ConfigField = {
  name: string
  validation: any
  defaultValue: any
}
