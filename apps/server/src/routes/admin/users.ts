import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
  updateUserSchema,
  createInviteSchema,
  acceptInviteSchema,
} from "@my-store/validators"
import {
  AdminGetInvitesParams,
  AdminGetUsersParams,
} from "@my-store/validators/admin-list-params"
import { rpcQueryValidator } from "../../lib/infra/query/rpc-query-validator"
import { userService } from "../../services/user.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"
import { verifyToken } from "../../lib/auth/jwt"

export const adminUsers = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/me", async (c) => {
    const authUser = c.get("user")
    const result = await userService.getMe(authUser.actor_id)
    return c.json(result)
  })
  .get("/", rpcQueryValidator(AdminGetUsersParams), async (c) => {
    const query = c.req.valid("query")
    const result = await userService.listUsers(query)
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await userService.getUserById(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id", zValidator("json", updateUserSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await userService.updateUser(c.req.param("id"), body)
    return c.json(result)
  })
  .delete("/:id", async (c) => {
    const result = await userService.deleteUser(c.req.param("id"))
    return c.json(result)
  })

export const adminInvites = new Hono<{ Variables: AuthVariables }>()
  .post("/accept", zValidator("json", acceptInviteSchema), async (c) => {
    const body = c.req.valid("json")
    const token = c.req.query("token") || c.req.query("invite_token") || ""
    if (!token) {
      return c.json({ message: "缺少邀请令牌" }, 400)
    }

    let authUser: { actor_id: string; email: string } | undefined
    const authHeader = c.req.header("Authorization")
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const payload = await verifyToken(authHeader.slice(7))
        if (payload.actor_type === "user") {
          authUser = { actor_id: payload.actor_id, email: payload.email }
        }
      } catch {
        return c.json({ message: "无效的认证令牌" }, 401)
      }
    }

    const result = await userService.acceptInvite(token, body, authUser)
    return c.json(result)
  })
  .use("*", adminAuth)
  .get("/", rpcQueryValidator(AdminGetInvitesParams), async (c) => {
    const query = c.req.valid("query")
    const result = await userService.listInvites(query)
    return c.json(result)
  })
  .post("/", zValidator("json", createInviteSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await userService.createInvite(body)
    return c.json(result, 201)
  })
  .get("/:id", async (c) => {
    const result = await userService.getInviteById(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/resend", async (c) => {
    const result = await userService.resendInvite(c.req.param("id"))
    return c.json(result)
  })
  .delete("/:id", async (c) => {
    const result = await userService.deleteInvite(c.req.param("id"))
    return c.json(result)
  })
