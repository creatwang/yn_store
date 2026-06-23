/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SALES_CHANNEL_ID?: string
  readonly PUBLIC_SSG_LOCALES?: string
  readonly PUBLIC_DEFAULT_LOCALE?: string
  readonly ASTRO_OUTPUT?: string
}

declare namespace App {
  interface Locals {
    customerToken?: string
    noindex?: boolean
    locale?: string
  }
}