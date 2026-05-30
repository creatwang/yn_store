import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
  loginSchema,
  registerUserSchema,
  resetPasswordRequestSchema,
  updateProviderSchema,
  confirmResetPasswordSchema,
} from "@my-store/validators"
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
    },
  )
  .post(
    "/user/emailpass/register",
    zValidator("json", registerUserSchema),
    async (c) => {
      const { email, password } = c.req.valid("json")
      const result = await authService.registerUser(email, password)
      return c.json(result)
    },
  )
  .post(
    "/user/emailpass/reset-password",
    zValidator("json", resetPasswordRequestSchema),
    async (c) => {
      const { identifier } = c.req.valid("json")
      const result = await authService.requestPasswordReset(identifier)
      return c.json(result)
    },
  )
  .post(
    "/user/emailpass/update",
    zValidator("json", updateProviderSchema),
    async (c) => {
      const token =
        c.req.query("token") ||
        c.req.header("Authorization")?.replace(/^Bearer\s+/i, "") ||
        ""
      if (!token) {
        return c.json({ message: "缺少 token" }, 400)
      }
      const { password } = c.req.valid("json")
      const result = await authService.updateProviderPassword(token, password)
      return c.json(result)
    },
  )
  .post(
    "/customer/emailpass",
    zValidator("json", loginSchema),
    async (c) => {
      const { email, password } = c.req.valid("json")
      const result = await authService.customerLogin(email, password)
      return c.json(result)
    },
  )
  .post("/token/refresh", adminAuth, async (c) => {
    const user = c.get("user")
    const result = await authService.refresh(
      user.actor_id,
      user.email,
      user.sub,
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
  .post(
    "/password/confirmReset",
    zValidator("json", confirmResetPasswordSchema),
    async (c) => {
      const { token, password } = c.req.valid("json")
      const result = await authService.confirmPasswordReset(token, password)
      return c.json(result)
    },
  )
