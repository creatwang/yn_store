import { Hono } from "hono"
import { existsSync } from "node:fs"
import { mkdir, writeFile, unlink } from "node:fs/promises"
import path from "node:path"
import { and, eq, isNull } from "drizzle-orm"
import { adminAuth, type AuthVariables } from "../../middleware/auth"
import { file, generateId, getDb } from "@my-store/db"

const UPLOADS_DIR = path.resolve(process.cwd(), "public/uploads")

async function ensureUploadsDir() {
  if (!existsSync(UPLOADS_DIR)) {
    await mkdir(UPLOADS_DIR, { recursive: true })
  }
}

/**
 * POST /admin/uploads
 * 对齐 Medusa 官方：formData → 本地存储 + DB file 记录
 */
export const adminUploads = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .post("/", async (c) => {
    const form = await c.req.formData()
    const raw: (File | string)[] = form.getAll("files") as (File | string)[]
    const files: File[] = raw.filter((f): f is File => f instanceof File)

    if (!files.length) {
      return c.json({ message: "No files were uploaded" }, 400)
    }

    await ensureUploadsDir()
    const db = getDb()

    const uploadedFiles = await Promise.all(
      files.map(async (f) => {
        const id = generateId("file")
        const ext = path.extname(f.name)
        const safeBase = path
          .basename(f.name, ext)
          .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, "_")
        const filename = `${safeBase}-${id}${ext}`
        const filepath = path.join(UPLOADS_DIR, filename)

        const buffer = Buffer.from(await f.arrayBuffer())
        await writeFile(filepath, buffer)

        const url = `/uploads/${filename}`

        await db.insert(file).values({
          id,
          url,
          filename,
          mime_type: f.type || undefined,
          size: buffer.byteLength,
          access_type: "public",
          provider_id: "local",
        })

        return { id, url }
      }),
    )

    return c.json({ files: uploadedFiles })
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id")
    const db = getDb()
    const [row] = await db
      .select()
      .from(file)
      .where(and(eq(file.id, id), isNull(file.deleted_at)))
      .limit(1)
    if (!row) {
      return c.json({ message: "File not found" }, 404)
    }
    return c.json({ file: { id: row.id, url: row.url } })
  })
  .delete("/:id", async (c) => {
    const id = c.req.param("id")
    const db = getDb()
    const [row] = await db
      .update(file)
      .set({ deleted_at: new Date(), updated_at: new Date() })
      .where(and(eq(file.id, id), isNull(file.deleted_at)))
      .returning()
    if (!row) {
      return c.json({ message: "File not found" }, 404)
    }
    if (row.filename && existsSync(UPLOADS_DIR)) {
      try {
        await unlink(path.join(UPLOADS_DIR, row.filename))
      } catch {
        /* ignore missing file on disk */
      }
    }
    return c.json({ id, object: "file", deleted: true })
  })
