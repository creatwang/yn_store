/** 开发环境邮件占位：将邀请/重置链接输出到日志，便于 E2E 与本地验收 */
export function logDevMail(action: string, detail: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production" && process.env.DEV_MAIL_LOG !== "1") {
    return
  }
  console.log(`[dev-mail] ${action}`, JSON.stringify(detail, null, 2))
}

export function adminAppUrl(path: string) {
  const base = process.env.ADMIN_APP_URL || "http://localhost:5173/app"
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`
}

export function storefrontUrl(path: string) {
  const base = process.env.STOREFRONT_URL || "http://localhost:4321"
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`
}
