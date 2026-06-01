import { test, expect } from "@playwright/test"

test("首页可访问并含商品链接", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "精选商品" })).toBeVisible()
  const productLink = page.locator('a[href^="/products/"]').first()
  await expect(productLink).toBeVisible()
})

test("搜索页接受关键词", async ({ page }) => {
  await page.goto("/search?q=shirt")
  await expect(page.getByRole("heading", { name: "搜索" })).toBeVisible()
})

test("PDP 含加购按钮", async ({ page }) => {
  await page.goto("/")
  const link = page.locator('a[href^="/products/"]').first()
  const href = await link.getAttribute("href")
  test.skip(!href, "no products")
  await page.goto(href!)
  await expect(
    page.getByRole("button", { name: "加入购物车" }),
  ).toBeVisible()
})
