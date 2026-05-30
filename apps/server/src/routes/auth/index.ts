import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { loginSchema } from "@my-store/validators"
import { authService } from "../../services/auth.service"
import { adminAuth } from "../../middleware/auth"

export const authRoutes = new Hono()
  .post(
    "/user/emailpass",
    zValidator("json", loginSchema),
    async (c) => {
      const { email, password } = c.req.valid("json")
      const result = await authService.login(email, password)
      return c.json(result)
    }
  )
  .post(
    "/customer/emailpass",
    zValidator("json", loginSchema),
    async (c) => {
      const { email, password } = c.req.valid("json")
      const result = await authService.customerLogin(email, password)
      return c.json(result)
    }
  )
  .post("/token/refresh", adminAuth, async (c) => {
    const user = c.get("user")
    const result = await authService.refresh(
      user.actor_id,
      user.email,
      user.sub
    )
    return c.json(result)
  })
  .get("/session", adminAuth, async (c) => {
    const user = c.get("user")
    const session = await authService.getSession(user.actor_id)
    return c.json(session)
  })
  .delete("/session", adminAuth, async (c) => {
    return c.json({ success: true })
  })
  .post("/password/confirmReset", async (c) => {
    const body = await c.req.json().catch(() => ({}))
    return c.json({ success: true, ...body })
  })
