/**
 * 将所有 emailpass 账号密码重置为同一明文（Scrypt 哈希写入库）
 *
 * 用法:
 *   pnpm reset:passwords
 *   pnpm reset:passwords -- 123456
 */
import { sql } from "drizzle-orm"
import { loadEnv } from "../load-env"
import { getDb } from "@my-store/db"
import { hashPassword } from "../src/lib/auth/password-hash"

loadEnv()

const newPassword = process.argv[2] ?? "123456"

async function main() {
  const db = getDb()
  const passwordHash = await hashPassword(newPassword)

  const result = await db.execute(sql`
    UPDATE provider_identity
    SET provider_metadata = COALESCE(provider_metadata, '{}'::jsonb)
      || jsonb_build_object('password', ${passwordHash}::text)
    WHERE provider = 'emailpass'
      AND deleted_at IS NULL
    RETURNING entity_id
  `)

  const rows = Array.isArray(result)
    ? result
    : ((result as { rows?: { entity_id: string }[] }).rows ?? [])

  const emails = rows.map((r) => String(r.entity_id))
  if (emails.length === 0) {
    console.log("未找到 emailpass 账号，无需重置。")
    return
  }

  for (const email of emails) {
    console.log(`已重置: ${email}`)
  }

  console.log(`\n共 ${emails.length} 个账号，密码已设为: ${newPassword}`)
  console.log("算法: Scrypt (logN=15, r=8, p=1, base64)，与 Medusa 官方一致。")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
