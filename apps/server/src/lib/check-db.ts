import { sql } from "drizzle-orm"
import { getDb } from "@my-store/db"
import { getAppUiMountStatus } from "../host/mount-app"

export type HealthPayload = {
  status: "ok" | "degraded"
  timestamp: string
  database: "connected" | "disconnected"
  admin_ui: {
    mounted: boolean
    path: "/app"
  }
  message?: string
}

export async function checkDatabaseConnection(): Promise<{
  ok: boolean
  message?: string
}> {
  if (!process.env.DATABASE_URL) {
    return { ok: false, message: "未设置 DATABASE_URL（请编辑 apps/server/.env）" }
  }

  try {
    const db = getDb()
    await db.execute(sql`select 1`)
    return { ok: true }
  } catch (err) {
    return { ok: false, message: formatDbError(err) }
  }
}

export async function getHealthStatus(): Promise<{
  payload: HealthPayload
  statusCode: 200 | 503
}> {
  const timestamp = new Date().toISOString()
  const db = await checkDatabaseConnection()
  const adminUi = getAppUiMountStatus()
  const admin_ui = { mounted: adminUi.mounted, path: "/app" as const }

  if (!db.ok) {
    return {
      payload: {
        status: "degraded",
        timestamp,
        database: "disconnected",
        admin_ui,
        message: db.message,
      },
      statusCode: 503,
    }
  }

  return {
    payload: {
      status: "ok",
      timestamp,
      database: "connected",
      admin_ui,
    },
    statusCode: 200,
  }
}

/** 将 /api/health 结果打印到控制台（与 HTTP 响应体一致） */
export function logHealthToConsole(
  payload: HealthPayload,
  context: "startup" | "request" = "request"
) {
  const label =
    context === "startup"
      ? "[health] 启动自检"
      : "[health] GET /api/health"
  const body = JSON.stringify(payload)

  if (payload.status === "ok") {
    console.log(`${label} ${body}`)
    return
  }

  console.error(`${label} ${body}`)
}

export function formatDbError(err: unknown): string {
  const code =
    err instanceof Error
      ? (err as NodeJS.ErrnoException).code
      : undefined

  if (
    code === "ECONNREFUSED" ||
    (err instanceof Error && err.message.includes("ECONNREFUSED"))
  ) {
    return (
      "无法连接数据库（连接被拒绝）。请将 apps/server/.env 中的 DATABASE_URL 改为 Supabase 连接串，" +
      "或在本地启动 PostgreSQL（当前示例为 localhost:5432）。"
    )
  }

  if (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    (err instanceof Error &&
      (err.message.includes("ECONNRESET") ||
        err.message.includes("ETIMEDOUT") ||
        err.message.includes("Connection terminated")))
  ) {
    return (
      "数据库连接中断或超时（常见于 Supabase 连接池被打满）。请稍后重试；" +
      "开发环境请保持单实例 server、DB_POOL_MAX≤4，或改用 Transaction pooler URL。"
    )
  }

  if (
    err instanceof Error &&
    (err.message.includes("EMAXCONNSESSION") ||
      err.message.includes("max clients reached"))
  ) {
    return (
      "数据库 Session 连接池已满（Supabase 默认上限 15）。请关闭多余 dev/test 进程、" +
      "勿同时跑 Vitest 与 pnpm dev，并确认 apps/server/.env 使用 pooler 且 DB_POOL_MAX≤4。"
    )
  }

  if (err instanceof Error) {
    return err.message
  }

  return "数据库连接失败"
}
