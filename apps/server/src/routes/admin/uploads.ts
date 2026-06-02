import { Hono } from "hono"
import { existsSync } from "node:fs"
import { mkdir, writeFile, readdir, unlink } from "node:fs/promises"
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
 * defaultAdminUploadFields: ["id", "url"]
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
          .replace(/[^a-zA-Z0-9一-鿿_-]/g, "_")
        const filename = `${safeBase}-${id}${ext}`
        const filepath = path.join(UPLOADS_DIR, filename)

        const buffer = Buffer.from(await f.arrayBuffer())
        await writeFile(filepath, buffer)

        const url = `/uploads/${filename}`

        // Write DB record (gracefully degrade if file table missing)
        try {
          await db.insert(file).values({
            id, url, filename,
            mime_type: f.type || undefined,
            size: buffer.byteLength,
            access_type: "public",
            provider_id: "local",
          })
        } catch { /* file table may not exist yet */ }

        return { id, url }
      })
    )

    return c.json({ files: uploadedFiles })
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id")

    // DB lookup (try-catch: file table may not exist)
    try {
      const db = getDb()
      const [row] = await db
        .select()
        .from(file)
        .where(and(eq(file.id, id), isNull(file.deleted_at)))
        .limit(1)
      if (row) return c.json({ file: { id: row.id, url: row.url } })
    } catch { /* file table may not exist */ }

    // Legacy fallback: filesystem scan
    if (existsSync(UPLOADS_DIR)) {
      const entries = await readdir(UPLOADS_DIR)
      const match = entries.find((e) => e.includes(`-${id}.`))
      if (match) return c.json({ file: { id, url: `/uploads/${match}` } })
    }
    return c.json({ file: { id, url: `/uploads/${id}` } })
  })
  .delete("/:id", async (c) => {
    const id = c.req.param("id")

    // DB soft-delete (try-catch: file table may not exist)
    let deleted = false
    try {
      const db = getDb()
      const [row] = await db
        .update(file)
        .set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .where(and(eq(file.id, id), isNull(file.deleted_at)))
        .returning()
      deleted = !!row
      if (row?.filename && existsSync(UPLOADS_DIR)) {
        try { await unlink(path.join(UPLOADS_DIR, row.filename)) } catch {}
      }
    } catch { /* file table may not exist */ }

    // Legacy fallback: delete by filesystem match
    if (!deleted && existsSync(UPLOADS_DIR)) {
      const entries = await readdir(UPLOADS_DIR)
      const match = entries.find((e) => e.includes(`-${id}.`))
      if (match) {
        try { await unlink(path.join(UPLOADS_DIR, match)) } catch {}
      }
    }

    return c.json({ id, object: "file", deleted: true })
  })
