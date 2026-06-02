import { Hono } from "hono"
import { existsSync } from "node:fs"
import { mkdir, writeFile, readdir, unlink } from "node:fs/promises"
import path from "node:path"
import { adminAuth, type AuthVariables } from "../../middleware/auth"
import { generateId } from "@my-store/db"

const UPLOADS_DIR = path.resolve(process.cwd(), "public/uploads")

async function ensureUploadsDir() {
  if (!existsSync(UPLOADS_DIR)) {
    await mkdir(UPLOADS_DIR, { recursive: true })
  }
}

/** 按文件 ID 查找实际文件（上传时文件名格式为 {name}-{id}{ext}） */
async function findFileById(id: string): Promise<{ filename: string; url: string } | null> {
  if (!existsSync(UPLOADS_DIR)) return null
  const entries = await readdir(UPLOADS_DIR)
  const match = entries.find((e) => e.includes(`-${id}.`))
  if (!match) return null
  return { filename: match, url: `/uploads/${match}` }
}

/**
 * 对齐 Medusa 官方 POST /admin/uploads
 * - 官方: multer upload.array("files") → req.files → uploadFilesWorkflow → { files: result }
 * - 此处: Hono parseBody → 本地文件存储 → { files: [{ id, url }] }
 * - defaultAdminUploadFields: ["id", "url"]
 */
export const adminUploads = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .post("/", async (c) => {
    // c.req.parseBody() 对同名多文件不可靠，改用 formData().getAll()
    const form = await c.req.formData()
    const raw: (File | string)[] = form.getAll("files") as (File | string)[]
    const files: File[] = raw.filter((f): f is File => f instanceof File)

    if (!files.length) {
      return c.json({ message: "No files were uploaded" }, 400)
    }

    await ensureUploadsDir()

    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        const id = generateId("file")
        const ext = path.extname(file.name)
        const safeBase = path
          .basename(file.name, ext)
          .replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, "_")
        const filename = `${safeBase}-${id}${ext}`
        const filepath = path.join(UPLOADS_DIR, filename)

        const buffer = Buffer.from(await file.arrayBuffer())
        await writeFile(filepath, buffer)

        // 对齐 defaultAdminUploadFields: ["id", "url"]
        return { id, url: `/uploads/${filename}` }
      })
    )

    return c.json({ files: uploadedFiles })
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id")
    const found = await findFileById(id)
    if (!found) {
      return c.json({ file: { id, url: `/uploads/${id}` } })
    }
    return c.json({ file: { id, url: found.url } })
  })
  .delete("/:id", async (c) => {
    const id = c.req.param("id")
    const found = await findFileById(id)
    if (found) {
      const filepath = path.join(UPLOADS_DIR, found.filename)
      try { await unlink(filepath) } catch { /* 文件可能已被删除 */ }
    }
    return c.json({ id, object: "file", deleted: true })
  })
