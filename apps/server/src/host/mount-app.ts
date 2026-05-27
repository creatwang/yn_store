import { existsSync } from "node:fs"
import path from "node:path"
import { serveStatic } from "@hono/node-server/serve-static"
import type { Context, Hono } from "hono"

export const APP_UI_PATH = "/app" as const

/** 解析 Admin SPA 构建目录（绝对路径） */
export function resolveAppStaticDir(): string | null {
  const fromEnv =
    process.env.ADMIN_STATIC_ROOT?.trim() ||
    process.env.ADMIN_DIST?.trim()
  const candidates = [
    fromEnv ? path.resolve(fromEnv) : null,
    path.resolve(import.meta.dirname, "../../public/app"),
    path.resolve(process.cwd(), "public/app"),
  ].filter((p): p is string => Boolean(p))

  for (const dir of candidates) {
    if (existsSync(path.join(dir, "index.html"))) {
      return dir
    }
  }
  return null
}

export type AppUiMountStatus = {
  mounted: boolean
  path: typeof APP_UI_PATH
  distDir: string | null
}

export function getAppUiMountStatus(): AppUiMountStatus {
  if (process.env.SERVE_ADMIN === "0") {
    return { mounted: false, path: APP_UI_PATH, distDir: null }
  }
  const distDir = resolveAppStaticDir()
  return {
    mounted: distDir !== null,
    path: APP_UI_PATH,
    distDir,
  }
}

/** serveStatic 的 root 必须相对 process.cwd()，且不支持绝对路径 */
function toServeStaticRoot(absDir: string): string {
  const rel = path.relative(process.cwd(), absDir)
  return rel.split(path.sep).join("/") || "."
}

function setAssetCacheHeaders(filePath: string, c: Context) {
  if (filePath.includes("/assets/") || filePath.includes("assets/")) {
    c.header("Cache-Control", "public, max-age=31536000, immutable")
  }
}

function setIndexNoCache(c: Context) {
  c.header("Cache-Control", "no-cache, no-store, must-revalidate")
}

/**
 * 将 Vite build 后的 Admin SPA 挂到 /app。
 * 同源访问 /api，无需 Vite proxy。
 */
export function mountAppSpa(app: Hono): AppUiMountStatus {
  const status = getAppUiMountStatus()
  if (!status.mounted || !status.distDir) {
    return status
  }

  const root = toServeStaticRoot(status.distDir)

  app.get("/", (c) => c.redirect(`${APP_UI_PATH}/`))
  app.get(APP_UI_PATH, (c) => c.redirect(`${APP_UI_PATH}/`))

  app.get(
    `${APP_UI_PATH}/*`,
    serveStatic({
      root,
      rewriteRequestPath: (requestPath) => {
        const sub = requestPath.replace(/^\/app\/?/, "")
        if (!sub || sub.endsWith("/")) {
          return "/index.html"
        }
        return `/${sub}`
      },
      onFound: (filePath, c) => {
        setAssetCacheHeaders(filePath, c)
      },
    }),
    serveStatic({
      root,
      path: "index.html",
      onFound: (_filePath, c) => {
        setIndexNoCache(c)
      },
    })
  )

  return status
}
