/**
 * 批量回归 Settings 路由（Playwright）
 * 前置: pnpm dev:admin + pnpm dev:server
 */
import { chromium } from "playwright"

const BASE = "http://localhost:5173"
const EMAIL = "admin@medusa-test.com"
const PASSWORD = "supersecret"

const PATHS = [
  "/app/settings/store/currencies",
  "/app/settings/store/edit",
  "/app/settings/users/user_dzo0hx6mu04llnr9ybhay8rs9h",
  "/app/settings/users/user_dzo0hx6mu04llnr9ybhay8rs9h/edit",
  "/app/settings/regions/reg_01KSH31XHE23JF3MJV6XW4V1MV/edit",
  "/app/settings/tax-regions/txreg_01KSH31ZY1EWYF0H60856VBP60",
  "/app/settings/tax-regions/txreg_01KSH31ZY1SP58EDNXXTVAQ3X1/edit",
  "/app/settings/return-reasons/create",
  "/app/settings/return-reasons/rr_7knc7k4e9amdyhuu546hzy8ppb/edit",
  "/app/settings/refund-reasons/create",
  "/app/settings/refund-reasons/refr_01KSH2VVZE2KS2GAZ4XA0JCVAC/edit",
  "/app/settings/product-types/create",
  "/app/settings/product-types/ptyp_igr0sx685htp8iugtsyt55d2m5",
  "/app/settings/product-types/ptyp_igr0sx685htp8iugtsyt55d2m5/edit",
  "/app/settings/product-tags/ptag_lyjrhwqsx3o7ytqef7ghzc1vux",
  "/app/settings/product-tags/create",
  "/app/settings/product-tags/ptag_lyjrhwqsx3o7ytqef7ghzc1vux/edit",
  "/app/settings/locations/shipping-profiles",
  "/app/settings/locations/shipping-option-types",
  "/app/settings/locations/sloc_im54q1zqztnneuzhvhwem4o6ua",
  "/app/settings/locations/sloc_yr37rngnf8f2b7r89ru85xi9qk/edit",
]

const NOT_FOUND_MARKERS = [
  "404 - 此地址不存在",
  "404 - There is no page at this address",
]

async function login(page) {
  await page.goto(`${BASE}/app/login`, { waitUntil: "networkidle" })
  await page.getByPlaceholder("电子邮件").fill(EMAIL)
  await page.getByPlaceholder("密码").fill(PASSWORD)
  await page.getByRole("button", { name: "使用邮箱继续" }).click()
  await page.waitForURL(/\/app\/(orders|products)/, { timeout: 15000 })
}

async function checkPath(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" })
  await page.waitForTimeout(800)
  const url = page.url()
  const body = await page.locator("body").innerText()
  const is404 = NOT_FOUND_MARKERS.some((m) => body.includes(m))
  const pathOk = url.includes(path.replace("/app", "")) || url === `${BASE}${path}`
  const hasSettings = body.includes("设置") || url.includes("/settings/")
  return { path, url, is404, pathOk, hasSettings, ok: !is404 && pathOk }
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const pageErrors = []

page.on("pageerror", (err) => pageErrors.push(err.message))
page.on("console", (msg) => {
  if (msg.type() === "error") {
    pageErrors.push(msg.text())
  }
})

try {
  await login(page)
  console.log("login ok\n")

  const results = []
  for (const path of PATHS) {
    pageErrors.length = 0
    const r = await checkPath(page, path)
    const runtimeErrors = pageErrors.filter(
      (e) =>
        e.includes("is not defined") ||
        e.includes("ReferenceError") ||
        e.includes("__BACKEND_URL__"),
    )
    results.push({ ...r, runtimeErrors })
  }

  const failed = results.filter((r) => !r.ok || r.runtimeErrors.length > 0)
  for (const r of results) {
    const status =
      r.ok && r.runtimeErrors.length === 0 ? "PASS" : "FAIL"
    console.log(`${status}  ${r.path}`)
    if (!r.ok) {
      console.log(`       url=${r.url} is404=${r.is404} pathOk=${r.pathOk}`)
    }
    for (const err of r.runtimeErrors) {
      console.log(`       runtime: ${err.slice(0, 120)}`)
    }
  }
  console.log(
    `\n${results.length - failed.length}/${results.length} passed (incl. no runtime errors)`,
  )
  process.exit(failed.length ? 1 : 0)
} finally {
  await browser.close()
}
