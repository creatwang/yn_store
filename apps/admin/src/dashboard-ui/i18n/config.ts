import { InitOptions } from "i18next"

export const defaultI18nOptions: InitOptions = {
  debug: process.env.NODE_ENV === "development",
  detection: {
    caches: ["cookie", "localStorage", "header"],
    lookupCookie: "lng",
    lookupLocalStorage: "lng",
    order: ["cookie", "localStorage", "header"],
  },
  // Default to Simplified Chinese while still allowing user selection.
  fallbackLng: "zhCN",
  lng: "zhCN",
  fallbackNS: "translation",
  interpolation: {
    escapeValue: false,
  },
}
