import { test, expect } from "@playwright/test"

test.describe("Admin 冒烟", () => {
  test("登录页可打开", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByRole("heading", { name: /登录|login/i })).toBeVisible({ timeout: 15_000 })
  })

  test("登录后产品列表可见", async ({ page }) => {
    test.skip(!process.env.ADMIN_E2E_EMAIL, "需设置 ADMIN_E2E_EMAIL / ADMIN_E2E_PASSWORD")

    await page.goto("/login")
    await page.getByPlaceholder(/邮箱|email/i).fill(process.env.ADMIN_E2E_EMAIL!)
    await page.getByPlaceholder(/密码|password/i).fill(process.env.ADMIN_E2E_PASSWORD!)
    await page.getByRole("button", { name: /登录|sign in/i }).click()

    await page.waitForURL(/\/(products|orders)?/, { timeout: 20_000 })
    await expect(page.locator("body")).not.toContainText("Unauthorized")
  })
})
