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
  if (dbMsg.includes("无法连接数据库") || dbMsg.includes("ECONNREFUSED")) {
    return dbMsg
  }
  if (err instanceof Error && err.message) {
    return err.message
  }
  return "Internal Server Error"
}

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      { message: err.message, type: "invalid_data" },
      err.status
    )
  }

  console.error(err)

  const message = isDev() ? getUnknownErrorMessage(err) : "Internal Server Error"

  return c.json({ message, type: "unknown_error" }, 500)
}
