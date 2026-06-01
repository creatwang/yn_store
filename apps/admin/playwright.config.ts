import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    // Default to Vite default port; override with PLAYWRIGHT_BASE_URL env
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173/app/",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Skip webServer in CI (servers started separately) or when PLAYWRIGHT_SKIP_WEBSERVER is set
  webServer: !process.env.CI && !process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? {
        command: "pnpm dev",
        url: "http://localhost:5173/app/login",
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
})
