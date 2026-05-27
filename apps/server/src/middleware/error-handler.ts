import type { ErrorHandler } from "hono"
import { HTTPException } from "hono/http-exception"

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      { message: err.message, type: "invalid_data" },
      err.status
    )
  }

  console.error(err)
  return c.json(
    { message: "Internal Server Error", type: "unknown_error" },
    500
  )
}
