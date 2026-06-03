import { and, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm"
import { generateId, getDb, user, invite } from "@my-store/db"
import type {
  UpdateUserInput,
  CreateInviteInput,
  AcceptInviteInput,
} from "@my-store/validators"
import type {
  AdminGetUsersParamsType,
  AdminGetInvitesParamsType,
} from "@my-store/validators/admin-list-params"
import { listLimitOffset } from "../lib/query-filters"
import { HTTPException } from "hono/http-exception"
import crypto from "node:crypto"
import { signInviteToken, verifyOpaqueToken } from "../lib/jwt"
import { adminAppUrl, sendInviteEmail, sendInviteResendEmail } from "../lib/mail"

export const userService = {
  // ── 用户 CRUD ──────────────────────────────────────────────

  async listUsers(query: AdminGetUsersParamsType) {
    const { limit, offset } = listLimitOffset(query, { limit: 50, offset: 0 })
    const db = getDb()
    const conditions = [isNull(user.deleted_at)]

    if (query.q) {
      conditions.push(
        or(
          ilike(user.email, `%${query.q}%`),
          ilike(user.first_name, `%${query.q}%`),
          ilike(user.last_name, `%${query.q}%`),
        )!
      )
    }

    const where = and(...conditions)

    const orderBy = query.order
      ? query.order.startsWith("-")
        ? desc(user[query.order.slice(1) as keyof typeof user] as any)
        : desc(user[query.order as keyof typeof user] as any)
      : desc(user.created_at)

    const [users, [{ total }]] = await Promise.all([
      db
        .select({
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          avatar_url: user.avatar_url,
          metadata: user.metadata,
          created_at: user.created_at,
          updated_at: user.updated_at,
        })
        .from(user)
        .where(where)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(user).where(where),
    ])

    return {
      users,
      count: Number(total),
      limit,
      offset,
    }
  },

  async getUserById(id: string) {
    const db = getDb()
    const [item] = await db
      .select({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.avatar_url,
        metadata: user.metadata,
        created_at: user.created_at,
        updated_at: user.updated_at,
      })
      .from(user)
      .where(and(eq(user.id, id), isNull(user.deleted_at)))
      .limit(1)

    if (!item) {
      throw new HTTPException(404, { message: "用户不存在" })
    }

    return { user: item }
  },

  async getMe(userId: string) {
    return this.getUserById(userId)
  },

  async updateUser(id: string, input: UpdateUserInput) {
    const db = getDb()
    await this.getUserById(id) // 确保存在

    const [updated] = await db
      .update(user)
      .set({
        ...(input.first_name !== undefined && { first_name: input.first_name }),
        ...(input.last_name !== undefined && { last_name: input.last_name }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.avatar_url !== undefined && { avatar_url: input.avatar_url }),
        ...(input.metadata !== undefined && { metadata: input.metadata as any }),
        updated_at: sql`now()`,
      })
      .where(and(eq(user.id, id), isNull(user.deleted_at)))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: "用户不存在" })
    }

    return { user: updated }
  },

  async deleteUser(id: string) {
    const db = getDb()
    await this.getUserById(id) // 确保存在

    await db
      .update(user)
      .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
      .where(and(eq(user.id, id), isNull(user.deleted_at)))

    return { id, object: "user", deleted: true }
  },

  // ── 邀请 CRUD ──────────────────────────────────────────────

  async listInvites(query: AdminGetInvitesParamsType) {
    const db = getDb()
    const { limit, offset } = listLimitOffset(query, { limit: 50, offset: 0 })
    const conditions = [isNull(invite.deleted_at)]

    const where = and(...conditions)

    const [invites, [{ total }]] = await Promise.all([
      db
        .select()
        .from(invite)
        .where(where)
        .orderBy(desc(invite.created_at))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(invite).where(where),
    ])

    return {
      invites,
      count: Number(total),
      limit,
      offset,
    }
  },

  async createInvite(input: CreateInviteInput) {
    const db = getDb()
    const id = generateId("invite")
    const rawToken = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const exp = Math.floor(expiresAt.getTime() / 1000)
    const jwtToken = await signInviteToken({
      id,
      jti: rawToken,
      email: input.email,
      exp,
    })

    const [created] = await db
      .insert(invite)
      .values({
        id,
        email: input.email,
        accepted: false,
        token: rawToken,
        expires_at: expiresAt,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning()

    const invite_url = adminAppUrl(`/invite?token=${encodeURIComponent(jwtToken)}`)
    await sendInviteEmail(input.email, invite_url)

    return {
      invite: { ...created, token: jwtToken },
      invite_url,
    }
  },

  async getInviteById(id: string) {
    const db = getDb()
    const [item] = await db
      .select()
      .from(invite)
      .where(and(eq(invite.id, id), isNull(invite.deleted_at)))
      .limit(1)

    if (!item) {
      throw new HTTPException(404, { message: "邀请不存在" })
    }

    return { invite: item }
  },

  async acceptInvite(
    inviteToken: string,
    input: AcceptInviteInput,
    authUser?: { actor_id: string; email: string },
  ) {
    const db = getDb()

    let dbToken = inviteToken
    try {
      const decoded = await verifyOpaqueToken(inviteToken)
      dbToken = String(decoded.jti ?? inviteToken)
    } catch {
      // 兼容 raw hex token
    }

    const [inv] = await db
      .select()
      .from(invite)
      .where(
        and(
          eq(invite.token, dbToken),
          eq(invite.email, input.email),
          eq(invite.accepted, false),
          isNull(invite.deleted_at),
        ),
      )
      .limit(1)

    if (!inv) {
      throw new HTTPException(404, { message: "邀请不存在或已过期" })
    }

    if (new Date(inv.expires_at) < new Date()) {
      throw new HTTPException(400, { message: "邀请已过期" })
    }

    if (authUser) {
      if (authUser.email !== input.email) {
        throw new HTTPException(400, { message: "邮箱与邀请不匹配" })
      }

      await db
        .update(invite)
        .set({ accepted: true, updated_at: sql`now()` })
        .where(eq(invite.id, inv.id))

      await db
        .update(user)
        .set({
          first_name: input.first_name,
          last_name: input.last_name,
          updated_at: sql`now()`,
        })
        .where(eq(user.id, authUser.actor_id))

      return { user: { id: authUser.actor_id, email: input.email } }
    }

    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, input.email))
      .limit(1)

    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      userId = generateId("user")
      await db.insert(user).values({
        id: userId,
        email: input.email,
        first_name: input.first_name,
        last_name: input.last_name,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
    }

    await db
      .update(invite)
      .set({ accepted: true, updated_at: sql`now()` })
      .where(eq(invite.id, inv.id))

    return { user: { id: userId, email: input.email } }
  },

  async resendInvite(id: string) {
    const db = getDb()
    const { invite: current } = await this.getInviteById(id)

    const rawToken = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const exp = Math.floor(expiresAt.getTime() / 1000)
    const jwtToken = await signInviteToken({
      id: current.id,
      jti: rawToken,
      email: current.email,
      exp,
    })

    const [updated] = await db
      .update(invite)
      .set({
        token: rawToken,
        expires_at: expiresAt,
        accepted: false,
        updated_at: sql`now()`,
      })
      .where(and(eq(invite.id, id), isNull(invite.deleted_at)))
      .returning()

    const invite_url = adminAppUrl(`/invite?token=${encodeURIComponent(jwtToken)}`)
    await sendInviteResendEmail(current.email, invite_url)

    return { invite: { ...updated, token: jwtToken }, invite_url }
  },

  async deleteInvite(id: string) {
    const db = getDb()
    await this.getInviteById(id)

    await db
      .update(invite)
      .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
      .where(and(eq(invite.id, id), isNull(invite.deleted_at)))

    return { id, object: "invite", deleted: true }
  },
}
