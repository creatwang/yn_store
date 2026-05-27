import { createMiddleware } from "hono/factory"
import { HTTPException } from "hono/http-exception"
import { verifyToken, type TokenPayload } from "../lib/jwt"

export type AuthVariables = {
  user: TokenPayload
}

export const adminAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const header = c.req.header("Authorization")
    if (!header?.startsWith("Bearer ")) {
      throw new HTTPException(401, { message: "Unauthorized" })
    }

    const token = header.slice(7)
    try {
      const payload = await verifyToken(token)
      if (payload.actor_type !== "user") {
        throw new HTTPException(401, { message: "Unauthorized" })
      }
      c.set("user", payload)
      await next()
    } catch {
      throw new HTTPException(401, { message: "Invalid token" })
    }
  }
)
