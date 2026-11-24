import { expect, test } from "@playwright/test"

test("renders the start page without console errors", async ({ page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  await page.goto("/")
  // @if admin-layout
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible()
  // @else
  await expect(page.getByRole("heading", { level: 1, name: "{{appName}}" })).toBeVisible()
  // @endif
  expect(errors).toEqual([])
})
// @if router

test("serves deep links and shows the 404 page", async ({ page }) => {
  await page.goto("/no/such/page")
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible()
})
// @endif
// @if theme

test("switches to dark mode and remembers it", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Dark" }).click()
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page.reload()
  await expect(page.locator("html")).toHaveClass(/dark/)
})
// @endif
