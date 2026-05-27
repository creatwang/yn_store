import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "node:path"
import { devStartupLogPlugin } from "./vite-log-startup"

export default defineConfig({
  plugins: [react(), devStartupLogPlugin()],
  base: "/app/",
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
        target: "http://localhost:9000",
        changeOrigin: true,
      },
    },
  },
})
