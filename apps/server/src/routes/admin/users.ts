import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
  listUsersSchema,
  updateUserSchema,
  createInviteSchema,
  acceptInviteSchema,
  listInvitesSchema,
} from "@my-store/validators"
import { userService } from "../../services/user.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

// ── 用户管理 ──────────────────────────────────────────────────
export const adminUsers = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  // GET /admin/users/me — 当前用户
  .get("/me", async (c) => {
    const authUser = c.get("user")
    const result = await userService.getMe(authUser.actor_id)
    return c.json(result)
  })
  // GET /admin/users — 用户列表
  .get("/", zValidator("query", listUsersSchema), async (c) => {
    const query = c.req.valid("query")
    const result = await userService.listUsers(query)
    return c.json(result)
  })
  // GET /admin/users/:id — 用户详情
  .get("/:id", async (c) => {
    const result = await userService.getUserById(c.req.param("id"))
    return c.json(result)
  })
  // POST /admin/users/:id — 更新用户
  .post("/:id", zValidator("json", updateUserSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await userService.updateUser(c.req.param("id"), body)
    return c.json(result)
  })
  // DELETE /admin/users/:id — 删除用户
  .delete("/:id", async (c) => {
    const result = await userService.deleteUser(c.req.param("id"))
    return c.json(result)
  })

// ── 邀请管理 ──────────────────────────────────────────────────
export const adminInvites = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  // GET /admin/invites — 邀请列表
  .get("/", zValidator("query", listInvitesSchema), async (c) => {
    const query = c.req.valid("query")
    const result = await userService.listInvites(query)
    return c.json(result)
  })
  // POST /admin/invites — 创建邀请
  .post("/", zValidator("json", createInviteSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await userService.createInvite(body)
    return c.json(result, 201)
  })
  // POST /admin/invites/accept — 接受邀请（可能不需要 adminAuth）
  .post("/accept", zValidator("json", acceptInviteSchema), async (c) => {
    const body = c.req.valid("json")
    // invite_token 从 query 参数获取
    const token = c.req.query("token") || c.req.query("invite_token")
    if (!token) {
      return c.json({ message: "缺少邀请令牌" }, 400)
    }
    const result = await userService.acceptInvite(token, body)
    return c.json(result)
  })
  // GET /admin/invites/:id — 邀请详情
  .get("/:id", async (c) => {
    const result = await userService.getInviteById(c.req.param("id"))
    return c.json(result)
  })
  // POST /admin/invites/:id/resend — 重新发送邀请
  .post("/:id/resend", async (c) => {
    const result = await userService.resendInvite(c.req.param("id"))
    return c.json(result)
  })
  // DELETE /admin/invites/:id — 删除邀请
  .delete("/:id", async (c) => {
    const result = await userService.deleteInvite(c.req.param("id"))
    return c.json(result)
  })
