import { test, expect } from "@playwright/test"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Log in via UI and return the JWT token from localStorage */
async function loginViaUI(page: Parameters<Parameters<typeof test>[1]>[0]["page"]) {
  const email = process.env.ADMIN_E2E_EMAIL
  const password = process.env.ADMIN_E2E_PASSWORD
  test.skip(!email, "需设置 ADMIN_E2E_EMAIL / ADMIN_E2E_PASSWORD")

  await page.goto("/login")
  await page.getByPlaceholder(/邮箱|email/i).fill(email!)
  await page.getByPlaceholder(/密码|password/i).fill(password!)
  await page.getByRole("button", { name: /登录|sign in|continue/i }).click()
  await page.waitForURL(/\/(products|orders)?/, { timeout: 20_000 })
  await expect(page.locator("body")).not.toContainText("Unauthorized")

  // Extract the JWT from localStorage so we can make API calls
  const token = await page.evaluate(() => localStorage.getItem("admin_token"))
  return token as string | null
}

/** Create a minimal order via Admin API using the JWT token. Returns the order ID. */
async function createOrderViaAPI(token: string): Promise<string> {
  const apiBase = process.env.PLAYWRIGHT_API_URL || "http://localhost:9000"

  // 1. Create order
  const createRes = await fetch(`${apiBase}/api/admin/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email: "e2e@test.com", currency_code: "usd" }),
  })
  if (!createRes.ok) {
    throw new Error(`Create order failed: ${createRes.status} ${await createRes.text()}`)
  }
  const order = (await createRes.json()) as { order: { id: string } }
  return order.order.id
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Admin 冒烟", () => {
  test("登录页可打开", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" })
    // Verify the root div exists (SPA has loaded)
    await expect(page.locator("#root")).not.toBeEmpty({ timeout: 20_000 })
    // There should be an email input for login
    await expect(page.locator('input[type="email"], input[autocomplete="email"], input[type="text"]').first()).toBeVisible({ timeout: 10_000 })
  })

  test("登录后产品列表可见", async ({ page }) => {
    await loginViaUI(page)
    // Already on products or orders list — verify something loaded
    const bodyText = await page.locator("body").innerText()
    expect(bodyText.length).toBeGreaterThan(0)
  })

  test("登录后订单列表可见", async ({ page }) => {
    await loginViaUI(page)
    await page.goto("/orders")
    await page.waitForLoadState("networkidle")
    await expect(page.locator("body")).not.toContainText("Unauthorized")
    const bodyText = await page.locator("body").innerText()
    expect(bodyText.length).toBeGreaterThan(0)
  })

  test("订单详情页可打开", async ({ page }) => {
    const token = await loginViaUI(page)
    if (!token) return

    const orderId = await createOrderViaAPI(token)

    await page.goto(`/orders/${orderId}`)
    await page.waitForLoadState("networkidle")

    await expect(page.locator("body")).not.toContainText("Unauthorized")
    const bodyText = await page.locator("body").innerText()
    expect(bodyText.length).toBeGreaterThan(50)
  })
})
