import Scrypt from "scrypt-kdf"

/** 与 @medusajs/medusa/auth-emailpass 默认一致 */
const DEFAULT_HASH_CONFIG = { logN: 15, r: 8, p: 1 } as const

/** 官方 emailpass：Scrypt KDF → base64 存入 provider_metadata.password */
export async function hashPassword(password: string): Promise<string> {
  const passwordHash = await Scrypt.kdf(password, DEFAULT_HASH_CONFIG)
  return passwordHash.toString("base64")
}

export async function verifyPassword(
  stored: string | undefined,
  password: string,
): Promise<boolean> {
  if (!stored) return false

  try {
    const buf = Buffer.from(stored, "base64")
    return await Scrypt.verify(buf, password)
  } catch {
    return false
  }
}
