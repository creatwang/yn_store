import { cors } from "hono/cors"

function parseOriginList(value: string | undefined): string[] {
  if (!value?.trim()) return []
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

function isLocalDevOrigin(origin: string): boolean {
  return (
    /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)
  )
}

const storeOrigins = parseOriginList(process.env.STORE_CORS_ORIGIN)
const extraOrigins = parseOriginList(process.env.CORS_ORIGIN)
const allowedOrigins = new Set([...storeOrigins, ...extraOrigins])

export const corsMiddleware = cors({
  origin: (origin) => {
    if (!origin) {
      return null
    }
    if (allowedOrigins.has(origin)) {
      return origin
    }
    if (process.env.NODE_ENV !== "production" && isLocalDevOrigin(origin)) {
      return origin
    }
    return null
  },
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "x-publishable-api-key"],
  credentials: true,
})
