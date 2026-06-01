# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> Admin 冒烟 >> 登录页可打开
- Location: e2e\smoke.spec.ts:50:3

# Error details

```
Error: expect(locator).not.toBeEmpty() failed

Locator: locator('#root')
Expected: not empty
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "not toBeEmpty" with timeout 20000ms
  - waiting for locator('#root')

```

```yaml
- text: The server is configured with a public base URL of /app/ - did you mean to visit
- link "/app/login":
  - /url: /app/login
- text: instead?
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test"
  2  | 
  3  | // ---------------------------------------------------------------------------
  4  | // Helpers
  5  | // ---------------------------------------------------------------------------
  6  | 
  7  | /** Log in via UI and return the JWT token from localStorage */
  8  | async function loginViaUI(page: Parameters<Parameters<typeof test>[1]>[0]["page"]) {
  9  |   const email = process.env.ADMIN_E2E_EMAIL
  10 |   const password = process.env.ADMIN_E2E_PASSWORD
  11 |   test.skip(!email, "需设置 ADMIN_E2E_EMAIL / ADMIN_E2E_PASSWORD")
  12 | 
  13 |   await page.goto("/login")
  14 |   await page.getByPlaceholder(/邮箱|email/i).fill(email!)
  15 |   await page.getByPlaceholder(/密码|password/i).fill(password!)
  16 |   await page.getByRole("button", { name: /登录|sign in|continue/i }).click()
  17 |   await page.waitForURL(/\/(products|orders)?/, { timeout: 20_000 })
  18 |   await expect(page.locator("body")).not.toContainText("Unauthorized")
  19 | 
  20 |   // Extract the JWT from localStorage so we can make API calls
  21 |   const token = await page.evaluate(() => localStorage.getItem("admin_token"))
  22 |   return token as string | null
  23 | }
  24 | 
  25 | /** Create a minimal order via Admin API using the JWT token. Returns the order ID. */
  26 | async function createOrderViaAPI(token: string): Promise<string> {
  27 |   const apiBase = process.env.PLAYWRIGHT_API_URL || "http://localhost:9000"
  28 | 
  29 |   // 1. Create order
  30 |   const createRes = await fetch(`${apiBase}/api/admin/orders`, {
  31 |     method: "POST",
  32 |     headers: {
  33 |       "Content-Type": "application/json",
  34 |       Authorization: `Bearer ${token}`,
  35 |     },
  36 |     body: JSON.stringify({ email: "e2e@test.com", currency_code: "usd" }),
  37 |   })
  38 |   if (!createRes.ok) {
  39 |     throw new Error(`Create order failed: ${createRes.status} ${await createRes.text()}`)
  40 |   }
  41 |   const order = (await createRes.json()) as { order: { id: string } }
  42 |   return order.order.id
  43 | }
  44 | 
  45 | // ---------------------------------------------------------------------------
  46 | // Tests
  47 | // ---------------------------------------------------------------------------
  48 | 
  49 | test.describe("Admin 冒烟", () => {
  50 |   test("登录页可打开", async ({ page }) => {
  51 |     await page.goto("/login", { waitUntil: "domcontentloaded" })
  52 |     // Verify the root div exists (SPA has loaded)
> 53 |     await expect(page.locator("#root")).not.toBeEmpty({ timeout: 20_000 })
     |                                             ^ Error: expect(locator).not.toBeEmpty() failed
  54 |     // There should be an email input for login
  55 |     await expect(page.locator('input[type="email"], input[autocomplete="email"], input[type="text"]').first()).toBeVisible({ timeout: 10_000 })
  56 |   })
  57 | 
  58 |   test("登录后产品列表可见", async ({ page }) => {
  59 |     await loginViaUI(page)
  60 |     // Already on products or orders list — verify something loaded
  61 |     const bodyText = await page.locator("body").innerText()
  62 |     expect(bodyText.length).toBeGreaterThan(0)
  63 |   })
  64 | 
  65 |   test("登录后订单列表可见", async ({ page }) => {
  66 |     await loginViaUI(page)
  67 |     await page.goto("/orders")
  68 |     await page.waitForLoadState("networkidle")
  69 |     await expect(page.locator("body")).not.toContainText("Unauthorized")
  70 |     const bodyText = await page.locator("body").innerText()
  71 |     expect(bodyText.length).toBeGreaterThan(0)
  72 |   })
  73 | 
  74 |   test("订单详情页可打开", async ({ page }) => {
  75 |     const token = await loginViaUI(page)
  76 |     if (!token) return
  77 | 
  78 |     const orderId = await createOrderViaAPI(token)
  79 | 
  80 |     await page.goto(`/orders/${orderId}`)
  81 |     await page.waitForLoadState("networkidle")
  82 | 
  83 |     await expect(page.locator("body")).not.toContainText("Unauthorized")
  84 |     const bodyText = await page.locator("body").innerText()
  85 |     expect(bodyText.length).toBeGreaterThan(50)
  86 |   })
  87 | })
  88 | 
```