import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
  loginSchema,
  registerUserSchema,
  registerCustomerSchema,
  resetPasswordRequestSchema,
  updateProviderSchema,
  confirmResetPasswordSchema,
} from "@my-store/validators"
import { authService } from "../../services/auth.service"
import { customerService } from "../../services/customer.service"
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
        return c.json({ message: "缂哄皯 token" }, 400)
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
  // 鈹€鈹€ Customer registration (Auth module) 鈹€鈹€
  .post(
    "/customer/emailpass/register",
    zValidator("json", registerCustomerSchema),
    async (c) => {
      const { email, password, first_name, last_name } = c.req.valid("json")
      const result = await customerService.register({
        email, password, first_name, last_name, has_account: true,
      })
      // Generate token for the registered customer
      const token = await authService.customerLogin(email, password)
      return c.json({ ...result, ...token }, 201)
    },
  )
  // 鈹€鈹€ OAuth callback (Admin + Storefront) 鈹€鈹€
  .on(["GET", "POST"], "/:actor_type/:auth_provider/callback", async (c) => {
    const { actor_type, auth_provider } = c.req.param()
    // Validate actor_type
    if (actor_type !== "user" && actor_type !== "customer") {
      return c.json({ message: `Invalid actor_type: ${actor_type}` }, 400)
    }
    // OAuth callback: validate with auth service
    try {
      const result = await authService.validateOAuthCallback(
        actor_type as "user" | "customer",
        auth_provider,
        { url: c.req.url, headers: c.req.header(), query: c.req.query(), body: await c.req.json().catch(() => ({})) },
      )
      return c.json(result)
    } catch (err: any) {
      // Pass through Hono HTTPException status codes
      if (err?.status) return c.json({ message: err.message }, err.status as any)
      return c.json({ message: err?.message || "OAuth authentication failed" }, 401)
    }
  })
