import { Hono } from "hono"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminUploads = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .post("/", async (c) => {
    const formData = await c.req.parseBody()
    const file = formData["file"]
    if (!file || !(file instanceof File)) {
      return c.json({ message: "No file provided" }, 400)
    }
    // For now return the file as a placeholder URL
    // In production, upload to S3/supabase-storage
    return c.json({
      files: [{ url: `blob:${file.name}` }],
    })
  })
