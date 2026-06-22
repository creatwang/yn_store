/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SALES_CHANNEL_ID?: string
}

declare namespace App {
  interface Locals {
    customerToken?: string
    noindex?: boolean
  }
}