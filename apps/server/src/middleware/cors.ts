import { cors } from "hono/cors"

export const corsMiddleware = cors({
  origin: (origin) => origin ?? "*",
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "x-publishable-api-key"],
  credentials: true,
})
