import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "node:path"
import { devStartupLogPlugin } from "./vite-log-startup"

export default defineConfig({
  plugins: [react(), devStartupLogPlugin()],
  base: "/app/",
  define: {
    __BASE__: JSON.stringify("/app/"),
    __MAX_UPLOAD_FILE_SIZE__: JSON.stringify(10 * 1024 * 1024), // 10MB
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
})
