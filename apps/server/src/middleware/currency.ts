import type { MiddlewareHandler } from "hono"
import {
  STORE_CURRENCY_HEADER,
  resolveRequestCurrency,
} from "../lib/currency/resolve-currency"

export type CurrencyVariables = {
  currency?: string
}

/** 解析 Store API 结算货币：X-Store-Currency 优先于 ?currency_code= */
export const currencyMiddleware: MiddlewareHandler<{ Variables: CurrencyVariables }> =
  async (c, next) => {
    const headerCurrency = c.req.header(STORE_CURRENCY_HEADER)
    const queryCurrency = c.req.query("currency_code")
    c.set("currency", resolveRequestCurrency(headerCurrency, queryCurrency))
    await next()
  }
