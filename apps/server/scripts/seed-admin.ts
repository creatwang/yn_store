/**
 * 创建/更新管理员（Scrypt，对齐 Medusa emailpass）
 *
 * 用法:
 *   pnpm seed:admin
 *   pnpm seed:admin -- admin@example.com YourPassword
 */
import { eq, isNull, and } from "drizzle-orm"
import { loadEnv } from "../load-env"
import {
  authIdentity,
  generateId,
  getDb,
  providerIdentity,
  user,
} from "@my-store/db"
import { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD } from "@my-store/config"
import { hashPassword } from "../src/lib/auth/password-hash"

loadEnv()

const email = process.argv[2] ?? process.env.SEED_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL
const password = process.argv[3] ?? process.env.SEED_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD

async function main() {
  const db = getDb()
  const passwordHash = await hashPassword(password)

  const [existingUser] = await db
    .select()
    .from(user)
    .where(and(eq(user.email, email), isNull(user.deleted_at)))
    .limit(1)

  if (existingUser) {
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
      const meta =
        (identity.provider_metadata as Record<string, unknown> | null) ?? {}
      await db
        .update(providerIdentity)
        .set({
          provider_metadata: { ...meta, password: passwordHash },
        })
        .where(eq(providerIdentity.id, identity.id))

      console.log(`已更新现有管理员密码: ${email}`)
      return
    }

    console.error(
      `邮箱 ${email} 在 user 表已存在，但没有 emailpass 登录记录。请在 Supabase 手动关联或换邮箱。`,
    )
    process.exit(1)
  }

  const userId = generateId("user")
  const authId = generateId("authid")
  const providerId = generateId("provid")

  await db.insert(user).values({
    id: userId,
    email,
    first_name: "Admin",
    last_name: "User",
  })

  await db.insert(authIdentity).values({
    id: authId,
    app_metadata: { user_id: userId },
  })

  await db.insert(providerIdentity).values({
    id: providerId,
    entity_id: email,
    provider: "emailpass",
    auth_identity_id: authId,
    provider_metadata: { password: passwordHash },
  })

  console.log("管理员已创建，可使用以下凭据登录 Admin：")
  console.log(`  邮箱: ${email}`)
  console.log(`  密码: ${password}`)
  console.log("  登录页: http://localhost:5173/app/login")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
