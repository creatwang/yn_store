import { validator } from "hono/validator"
import { HTTPException } from "hono/http-exception"
import type { ZodSchema } from "zod"
import { parse } from "qs"
import { normalizeQuery } from "./normalize-query"

function parseQueryFromUrl(url: string): Record<string, unknown> {
  const qIndex = url.indexOf("?")
  if (qIndex < 0) return {}
  const hashIndex = url.indexOf("#", qIndex)
  const raw =
    hashIndex >= 0
      ? url.slice(qIndex + 1, hashIndex)
      : url.slice(qIndex + 1)
  if (!raw) return {}

  const parsed = parse(raw, {
    allowDots: true,
    plainObjects: true,
    parseArrays: true,
  }) as Record<string, unknown>

  return normalizeQuery(parsed)
}

/**
 * Hono RPC 列表 query：qs 解析 bracket 参数 + normalizeQuery + Zod。
 * 与 admin 侧 toRpcQuery 成对使用。
 */
export function rpcQueryValidator<T extends ZodSchema>(schema: T) {
  return validator("query", async (_value, c) => {
    const query = parseQueryFromUrl(c.req.url)
    const result = await schema.safeParseAsync(query)
    if (!result.success) {
      const message = result.error.issues
        .map((i) => i.message)
        .join("; ")
      throw new HTTPException(400, { message: message || "Invalid query" })
    }
    return result.data
  })
}
