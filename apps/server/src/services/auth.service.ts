import { and, eq, isNull, sql } from "drizzle-orm"
import crypto from "node:crypto"
import { hashPassword, verifyPassword } from "../lib/password-hash"
import {
  authIdentity,
  generateId,
  getDb,
  providerIdentity,
  user,
  customer,
} from "@my-store/db"
import { signToken, signResetPasswordToken, verifyOpaqueToken } from "../lib/jwt"
import { adminAppUrl, sendPasswordResetEmail } from "../lib/mail"
import { HTTPException } from "hono/http-exception"

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
    if (!(await verifyPassword(hash, password))) {
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
    if (!(await verifyPassword(hash, password))) {
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

    const hash = await hashPassword(password)
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

  /**
   * OAuth callback validation — 对齐 Medusa GET/POST /auth/:actor/:provider/callback
   */
  async validateOAuthCallback(
    actorType: "user" | "customer",
    provider: string,
    authData: { url: string; headers: Record<string, string>; query: Record<string, string>; body: Record<string, unknown> },
  ) {
    const supportedProviders = ["google", "github"]
    if (!supportedProviders.includes(provider)) {
      throw new HTTPException(404, { message: `OAuth provider "${provider}" is not supported. Supported: ${supportedProviders.join(", ")}` })
    }

    if (provider === "google") {
      const credential = (authData.body?.credential ?? authData.body?.id_token) as string | undefined
      if (!credential) {
        throw new HTTPException(400, { message: "Missing Google credential (id_token) in request body" })
      }
      const tokenInfo = await verifyGoogleIdToken(credential)
      if (!tokenInfo.email) {
        throw new HTTPException(401, { message: "Google token verification failed: no email" })
      }
      return this._oauthLogin(actorType, tokenInfo.email, {
        first_name: tokenInfo.given_name ?? null,
        last_name: tokenInfo.family_name ?? null,
      })
    }

    // GitHub — not yet implemented
    throw new HTTPException(501, {
      message: `OAuth provider "${provider}" is not yet configured. Set ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET env vars.`,
    })
  },

  /** Internal: find or create auth identity for OAuth login, then sign JWT */
  async _oauthLogin(
    actorType: "user" | "customer",
    email: string,
    profile: { first_name?: string | null; last_name?: string | null },
  ) {
    const db = getDb()
    const isAdmin = actorType === "user"
    const prefix = isAdmin ? "user" : "cus"

    const [existing] = await db
      .select()
      .from(providerIdentity)
      .where(and(
        eq(providerIdentity.entity_id, email),
        eq(providerIdentity.provider, "google"),
        isNull(providerIdentity.deleted_at),
      ))
      .limit(1)

    let actorId: string
    let authIdentityId: string
    if (existing) {
      authIdentityId = existing.auth_identity_id
      const [auth] = await db.select().from(authIdentity)
        .where(eq(authIdentity.id, existing.auth_identity_id))
        .limit(1)
      const appMeta = (auth?.app_metadata as Record<string, unknown> | null) ?? {}
      actorId = String(appMeta.user_id ?? "")
      if (!actorId) throw new HTTPException(401, { message: "Auth identity corrupted" })
    } else {
      actorId = generateId(prefix)
      if (isAdmin) {
        await db.insert(user).values({
          id: actorId,
          email,
          ...(profile.first_name ? { first_name: profile.first_name } : {}),
          ...(profile.last_name ? { last_name: profile.last_name } : {}),
          created_at: sql`now()`,
          updated_at: sql`now()`,
        })
      } else {
        await db.insert(customer).values({
          id: actorId,
          email,
          has_account: true,
          ...(profile.first_name ? { first_name: profile.first_name } : {}),
          ...(profile.last_name ? { last_name: profile.last_name } : {}),
          created_at: sql`now()`,
          updated_at: sql`now()`,
        })
      }

      authIdentityId = generateId("authid")
      await db.insert(authIdentity).values({
        id: authIdentityId, app_metadata: { user_id: actorId },
        created_at: sql`now()`, updated_at: sql`now()`,
      })
      await db.insert(providerIdentity).values({
        id: generateId("provid"), entity_id: email, provider: "google",
        auth_identity_id: authIdentityId, provider_metadata: { profile },
        created_at: sql`now()`, updated_at: sql`now()`,
      })
    }

    const token = await signToken({
      sub: authIdentityId!, actor_id: actorId,
      actor_type: isAdmin ? "user" : "customer", email,
    })
    const record = isAdmin
      ? (await db.select().from(user).where(eq(user.id, actorId)).limit(1))[0]
      : (await db.select().from(customer).where(eq(customer.id, actorId)).limit(1))[0]
    return { token, [isAdmin ? "user" : "customer"]: record }
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

    const hash = await hashPassword(password)
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

/**
 * Verify a Google ID token and return user info.
 * Uses Google's tokeninfo endpoint (no API key required).
 */
type GoogleTokenInfo = {
  email?: string
  given_name?: string
  family_name?: string
  sub: string
}

async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenInfo> {
  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.text()
    throw new HTTPException(401, { message: `Google token verification failed: ${err}` })
  }
  const data = (await res.json()) as Partial<GoogleTokenInfo>
  if (!data.sub) {
    throw new HTTPException(401, { message: "Google token verification failed: missing sub" })
  }
  return {
    sub: data.sub,
    email: data.email,
    given_name: data.given_name,
    family_name: data.family_name,
  }
}
