import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import path from "node:path"
import { devStartupLogPlugin } from "./vite-log-startup"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "")

  return {
  plugins: [react(), devStartupLogPlugin()],
  base: "/app/",
  define: {
    __BASE__: JSON.stringify("/app/"),
    __MAX_UPLOAD_FILE_SIZE__: JSON.stringify(10 * 1024 * 1024), // 10MB
    // Medusa Dashboard SDK（client.ts）依赖；未注入会在运行时 ReferenceError
    // 空字符串会落到 origin + /admin/*，与本项目 /api/admin/* 不一致
    __BACKEND_URL__: JSON.stringify(
      env.VITE_MEDUSA_ADMIN_BACKEND_URL || env.VITE_API_URL || "/api",
    ),
    __STOREFRONT_URL__: JSON.stringify(env.VITE_MEDUSA_STOREFRONT_URL || ""),
    __AUTH_TYPE__: JSON.stringify("jwt"),
    __JWT_TOKEN_STORAGE_KEY__: JSON.stringify("admin_token"),
  },
  build: {
    outDir: path.resolve(__dirname, "../server/public/app"),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Medusa JS SDK 默认请求 /admin/*（无 /api 前缀时的兜底）
      "/admin": {
        target: "http://localhost:7000",
        changeOrigin: true,
        rewrite: (path) => `/api${path}`,
      },
      "/api": {
        target: "http://localhost:7000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:7000",
        changeOrigin: true,
      },
    },
  },
  }
})
