import type { i18n as I18nInstance } from "i18next"

/**
 * Medusa dashboard uses custom locale codes (e.g. zhCN) that are not valid
 * BCP-47 tags. i18next v23 relies on Intl.PluralRules, which fails for those
 * codes and leaves plural keys like metadata.numberOfKeys unresolved.
 */
const MEDUSA_PLURAL_LOCALE_MAP: Record<string, string> = {
  zhCN: "zh-CN",
  zhTW: "zh-TW",
  enGB: "en-GB",
  ptBR: "pt-BR",
  ptPT: "pt-PT",
}

export function bindMedusaPluralLocales(i18n: I18nInstance) {
  const pluralResolver = i18n.services.pluralResolver
  const getRule = pluralResolver.getRule.bind(pluralResolver)

  pluralResolver.getRule = (code, options) => {
    const mappedCode = MEDUSA_PLURAL_LOCALE_MAP[code] ?? code
    return getRule(mappedCode, options)
  }
}
