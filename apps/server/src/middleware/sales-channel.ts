import { createMiddleware } from "hono/factory"

export type SalesChannelVariables = {
  salesChannelId: string | undefined
}

/**
 * 从 X-Sales-Channel 请求头读取渠道 ID，注入到 context 中。
 * 所有 /api/store/* 路由统一挂载此中间件。
 */
export const salesChannelMiddleware = createMiddleware<{
  Variables: SalesChannelVariables
}>(async (c, next) => {
  const header = c.req.header("X-Sales-Channel")
  c.set("salesChannelId", header || undefined)
  await next()
})
