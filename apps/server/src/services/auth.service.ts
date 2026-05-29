import { and, eq, isNull } from "drizzle-orm"
import bcrypt from "bcryptjs"
import {
  authIdentity,
  getDb,
  providerIdentity,
  user,
  customer,
} from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import { signToken } from "../lib/jwt"

type ProviderMetadata = {
  password?: string
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
}
