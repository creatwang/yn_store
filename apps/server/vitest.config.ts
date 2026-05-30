import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 60000,
    hookTimeout: 30000,
    // Supabase session pooler pool_size=15；并行 worker 各自建连接池会触发 EMAXCONNSESSION
    fileParallelism: false,
    maxWorkers: 1,
  },
})
