import { SignJWT, jwtVerify } from "jose"

export type TokenPayload = {
  sub: string
  actor_id: string
  actor_type: "user" | "customer"
  email: string
}

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error("JWT_SECRET is not set")
  }
  return new TextEncoder().encode(secret)
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret())
  return payload as unknown as TokenPayload
}

export async function signInviteToken(payload: {
  id: string
  jti: string
  email: string
  exp: number
}): Promise<string> {
  return new SignJWT({
    id: payload.id,
    jti: payload.jti,
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(payload.exp)
    .sign(getSecret())
}

export async function signResetPasswordToken(payload: {
  entity_id: string
  provider: string
  jti: string
  exp: number
}): Promise<string> {
  return new SignJWT({
    entity_id: payload.entity_id,
    provider: payload.provider,
    jti: payload.jti,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(payload.exp)
    .sign(getSecret())
}

export async function verifyOpaqueToken(token: string): Promise<Record<string, unknown>> {
  const { payload } = await jwtVerify(token, getSecret())
  return payload as Record<string, unknown>
}
