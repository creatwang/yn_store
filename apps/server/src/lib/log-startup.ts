import type { AppUiMountStatus } from "../host/mount-app"

const ADMIN_VITE_PORT = process.env.ADMIN_VITE_PORT || "5173"

/** server 进程启动时打印访问说明（开发 / 生产通用） */
export function logServerStartup(port: number, appMount: AppUiMountStatus) {
  const base = `http://localhost:${port}`
  const isDev = process.env.NODE_ENV !== "production"

  console.log(`🚀 Server running on ${base}`)
  console.log(`   API:      ${base}/api/health`)

  if (appMount.mounted) {
    console.log(`   Admin UI: ${base}/app/`)
    console.log(`             └─ 静态 build 产物（public/app），与 API 同源`)
    if (appMount.distDir) {
      console.log(`             └─ 目录: ${appMount.distDir}`)
    }
    if (isDev) {
      console.log(
        `   备注: pnpm dev 时改界面请用 Vite → http://localhost:${ADMIN_VITE_PORT}/app/ （HMR）`
      )
      console.log(
        `         此处 ${base}/app/ 不会随源码自动更新，需 pnpm build:admin 或 build:watch`
      )
    }
  } else {
    console.log("   Admin UI: 未挂载（执行 pnpm build:admin）")
    if (isDev) {
      console.log(
        `   开发后台: http://localhost:${ADMIN_VITE_PORT}/app/ （Vite，pnpm dev 已起 admin 时）`
      )
    }
  }

  if (isDev) {
    console.log(`   商城 dev:  http://localhost:4321/ （storefront，若已 pnpm dev）`)
  }
}
