import type { ErrorHandler } from "hono"
import { HTTPException } from "hono/http-exception"
import { formatDbError } from "../lib/check-db"

function isDev() {
  return process.env.NODE_ENV !== "production"
}

function getUnknownErrorMessage(err: unknown): string {
  if (err instanceof AggregateError && err.errors.length > 0) {
    return getUnknownErrorMessage(err.errors[0])
  }
  const dbMsg = formatDbError(err)
  if (
    dbMsg.includes("无法连接数据库") ||
    dbMsg.includes("ECONNREFUSED") ||
    dbMsg.includes("Session 连接池已满") ||
    dbMsg.includes("连接池被打满")
  ) {
    return dbMsg
  }
  if (err instanceof Error && err.message) {
    return err.message
  }
  return "Internal Server Error"
}

function isDbConnectivityError(err: unknown): boolean {
  const code =
    err instanceof Error ? (err as NodeJS.ErrnoException).code : undefined
  const msg = err instanceof Error ? err.message : ""
  return (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("Connection terminated") ||
    msg.includes("EMAXCONNSESSION") ||
    msg.includes("max clients reached") ||
    msg.includes("无法连接数据库") ||
    msg.includes("Session 连接池已满")
  )
}

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      { message: err.message, type: "invalid_data" },
      err.status
    )
  }

  console.error(err)

  if (isDbConnectivityError(err)) {
    const message = getUnknownErrorMessage(err)
    const code =
      err instanceof Error ? (err as NodeJS.ErrnoException).code : undefined
    return c.json(
      {
        message,
        type: "database_unavailable",
        ...(isDev() && code ? { code } : {}),
      },
      503,
    )
  }

  const message = isDev() ? getUnknownErrorMessage(err) : "Internal Server Error"

  return c.json({ message, type: "unknown_error" }, 500)
}
