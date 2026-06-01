import { and, eq, isNull, sql } from "drizzle-orm"
import bcrypt from "bcryptjs"
import crypto from "node:crypto"
import {
  authIdentity,
  generateId,
  getDb,
  providerIdentity,
  user,
  customer,
} from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import { signToken, signResetPasswordToken, verifyOpaqueToken } from "../lib/jwt"
import { adminAppUrl, sendPasswordResetEmail } from "../lib/mail"

type ProviderMetadata = {
  password?: string
  reset_token_jti?: string
  reset_expires_at?: string
}

type AppMetadata = {
  user_id?: string
}

export const authService = {
  async login(email: string, password: string) {
    const db = getDb()

    const [identity] = await db
      .select()
      .from(providerIdentity)
      .where(
        and(
          eq(providerIdentity.entity_id, email),
          eq(providerIdentity.provider, "emailpass"),
          isNull(providerIdentity.deleted_at)
        )
      )
      .limit(1)

    if (!identity) {
      throw new HTTPException(401, { message: "Invalid email or password" })
    }

    const meta = identity.provider_metadata as ProviderMetadata | null
    const hash = meta?.password
    if (!hash || !(await bcrypt.compare(password, hash))) {
      throw new HTTPException(401, { message: "Invalid email or password" })
    }

    const [auth] = await db
      .select()
      .from(authIdentity)
      .where(eq(authIdentity.id, identity.auth_identity_id))
      .limit(1)

    const appMeta = auth?.app_metadata as AppMetadata | null
    const userId = appMeta?.user_id

    if (!userId) {
      throw new HTTPException(401, { message: "User not linked to auth identity" })
    }

    const [adminUser] = await db
      .select()
      .from(user)
      .where(and(eq(user.id, userId), isNull(user.deleted_at)))
      .limit(1)

    if (!adminUser) {
      throw new HTTPException(401, { message: "User not found" })
    }

    const token = await signToken({
      sub: identity.auth_identity_id,
      actor_id: adminUser.id,
      actor_type: "user",
      email: adminUser.email,
    })

    return {
      token,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        first_name: adminUser.first_name,
        last_name: adminUser.last_name,
      },
    }
  },

  async getSession(actorId: string) {
    const db = getDb()
    const [adminUser] = await db
      .select()
      .from(user)
      .where(and(eq(user.id, actorId), isNull(user.deleted_at)))
      .limit(1)

    if (!adminUser) {
      throw new HTTPException(404, { message: "User not found" })
    }

    return {
      user: {
        id: adminUser.id,
        email: adminUser.email,
        first_name: adminUser.first_name,
        last_name: adminUser.last_name,
      },
    }
  },

  async refresh(actorId: string, email: string, sub: string) {
    const token = await signToken({
      sub,
      actor_id: actorId,
      actor_type: "user",
      email,
    })
    return { token }
  },

  async customerLogin(email: string, password: string) {
    const db = getDb()

    const [identity] = await db
      .select()
      .from(providerIdentity)
      .where(
        and(
          eq(providerIdentity.entity_id, email),
          eq(providerIdentity.provider, "emailpass"),
          isNull(providerIdentity.deleted_at)
        )
      )
      .limit(1)

    if (!identity) {
      throw new HTTPException(401, { message: "Invalid email or password" })
    }

    const meta = identity.provider_metadata as ProviderMetadata | null
    const hash = meta?.password
    if (!hash || !(await bcrypt.compare(password, hash))) {
      throw new HTTPException(401, { message: "Invalid email or password" })
    }

    const [auth] = await db
      .select()
      .from(authIdentity)
      .where(eq(authIdentity.id, identity.auth_identity_id))
      .limit(1)

    const appMeta = auth?.app_metadata as AppMetadata | null
    const customerId = appMeta?.user_id

    if (!customerId) {
      throw new HTTPException(401, { message: "Customer not linked to auth identity" })
    }

    const [cust] = await db
      .select()
      .from(customer)
      .where(and(eq(customer.id, customerId), isNull(customer.deleted_at)))
      .limit(1)

    if (!cust) {
      throw new HTTPException(401, { message: "Customer not found" })
    }

    const token = await signToken({
      sub: identity.auth_identity_id,
      actor_id: cust.id,
      actor_type: "customer",
      email: cust.email,
    })

    return {
      token,
      customer: {
        id: cust.id,
        email: cust.email,
        first_name: cust.first_name,
        last_name: cust.last_name,
      },
    }
  },

  async registerUser(email: string, password: string) {
    const db = getDb()

    const [existingIdentity] = await db
      .select()
      .from(providerIdentity)
      .where(
        and(
          eq(providerIdentity.entity_id, email),
          eq(providerIdentity.provider, "emailpass"),
          isNull(providerIdentity.deleted_at),
        ),
      )
      .limit(1)

    if (existingIdentity) {
      throw new HTTPException(409, { message: "User with this email already exists" })
    }

    const [existingUser] = await db
      .select()
      .from(user)
      .where(and(eq(user.email, email), isNull(user.deleted_at)))
      .limit(1)

    if (existingUser) {
      throw new HTTPException(409, { message: "User with this email already exists" })
    }

    const userId = generateId("user")
    await db.insert(user).values({
      id: userId,
      email,
      created_at: sql`now()`,
      updated_at: sql`now()`,
    })

    const authId = generateId("authid")
    await db.insert(authIdentity).values({
      id: authId,
      app_metadata: { user_id: userId },
      created_at: sql`now()`,
      updated_at: sql`now()`,
    })

    const hash = await bcrypt.hash(password, 10)
    await db.insert(providerIdentity).values({
      id: generateId("provid"),
      entity_id: email,
      provider: "emailpass",
      auth_identity_id: authId,
      provider_metadata: { password: hash },
      created_at: sql`now()`,
      updated_at: sql`now()`,
    })

    const token = await signToken({
      sub: authId,
      actor_id: userId,
      actor_type: "user",
      email,
    })

    return { token }
  },

  async requestPasswordReset(email: string) {
    const db = getDb()

    const [identity] = await db
      .select()
      .from(providerIdentity)
      .where(
        and(
          eq(providerIdentity.entity_id, email),
          eq(providerIdentity.provider, "emailpass"),
          isNull(providerIdentity.deleted_at),
        ),
      )
      .limit(1)

    if (identity) {
      const jti = crypto.randomBytes(16).toString("hex")
      const exp = Math.floor(Date.now() / 1000) + 3600
      const resetToken = await signResetPasswordToken({
        entity_id: email,
        provider: "emailpass",
        jti,
        exp,
      })

      const meta = (identity.provider_metadata as ProviderMetadata | null) ?? {}
      await db
        .update(providerIdentity)
        .set({
          provider_metadata: {
            ...meta,
            reset_token_jti: jti,
            reset_expires_at: new Date(exp * 1000).toISOString(),
          },
          updated_at: sql`now()`,
        })
        .where(eq(providerIdentity.id, identity.id))

      const resetUrl = adminAppUrl(`/reset-password?token=${encodeURIComponent(resetToken)}`)
      const result = await sendPasswordResetEmail(email, resetToken, resetUrl)

      if (result.reset_token) {
        return result
      }
    }

    return { success: true }
  },

  async updateProviderPassword(token: string, password: string) {
    return this.applyPasswordReset(token, password)
  },

  async confirmPasswordReset(token: string, password: string) {
    return this.applyPasswordReset(token, password)
  },

  async applyPasswordReset(token: string, password: string) {
    const db = getDb()
    let decoded: Record<string, unknown>
    try {
      decoded = await verifyOpaqueToken(token)
    } catch {
      throw new HTTPException(400, { message: "Invalid or expired reset token" })
    }

    const email = String(decoded.entity_id ?? "")
    const jti = String(decoded.jti ?? "")
    if (!email || !jti) {
      throw new HTTPException(400, { message: "Invalid reset token" })
    }

    const [identity] = await db
      .select()
      .from(providerIdentity)
      .where(
        and(
          eq(providerIdentity.entity_id, email),
          eq(providerIdentity.provider, "emailpass"),
          isNull(providerIdentity.deleted_at),
        ),
      )
      .limit(1)

    if (!identity) {
      throw new HTTPException(404, { message: "User not found" })
    }

    const meta = (identity.provider_metadata as ProviderMetadata | null) ?? {}
    if (meta.reset_token_jti !== jti) {
      throw new HTTPException(400, { message: "Invalid or expired reset token" })
    }

    if (meta.reset_expires_at && new Date(meta.reset_expires_at) < new Date()) {
      throw new HTTPException(400, { message: "Reset token expired" })
    }

    const hash = await bcrypt.hash(password, 10)
    await db
      .update(providerIdentity)
      .set({
        provider_metadata: {
          password: hash,
        },
        updated_at: sql`now()`,
      })
      .where(eq(providerIdentity.id, identity.id))

    return { success: true }
  },
}
