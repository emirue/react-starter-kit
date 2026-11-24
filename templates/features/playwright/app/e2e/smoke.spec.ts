import { expect, test, type Page } from "@playwright/test"

/** Every route the app serves at the top level, plus the 404 page. */
const ROUTES = [
  "/",
  // @if router
  "/no/such/page",
  // @endif
  // @if admin-layout
  "/settings",
  // @endif
  // @if admin-layout && examples
  "/users",
  // @endif
  // @if router && examples && tanstack-query || router && examples && hookform-resolvers || router && examples && zustand
  "/examples",
  // @endif
  // @if router && examples && tanstack-query
  "/examples/todos",
  // @endif
  // @if router && examples && hookform-resolvers
  "/examples/sign-up",
  // @endif
  // @if router && examples && zustand
  "/examples/counter",
  // @endif
]

/** Waits until the page has rendered its heading and finished loading data. */
async function settle(page: Page) {
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()
  await page.waitForLoadState("networkidle")
  // Loading regions (LoadingState); other status regions are live regions that stay in the DOM.
  await expect(page.getByRole("status", { name: /^Loading/ })).toHaveCount(0)
}

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

test("has exactly one main landmark", async ({ page }) => {
  await page.goto("/")
  await settle(page)
  await expect(page.getByRole("main")).toHaveCount(1)
})
// @if router

test("serves deep links and shows the 404 page", async ({ page }) => {
  await page.goto("/no/such/page")
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible()
})

test("the skip link is the first Tab stop and moves focus to the main landmark", async ({ page }) => {
  await page.goto("/")
  await settle(page)
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible()
  await page.keyboard.press("Tab")
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("main")).toBeFocused()
})
// @endif
// @if admin-layout || router && examples && tanstack-query || router && examples && hookform-resolvers || router && examples && zustand

// @if admin-layout
const LAZY_PAGE = "Settings"
// @else
const LAZY_PAGE = "Examples"
// @endif

test("navigates with the main navigation", async ({ page }) => {
  await page.goto("/")
  await settle(page)
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: LAZY_PAGE }).click()
  await expect(page.getByRole("heading", { level: 1, name: LAZY_PAGE })).toBeVisible()
})

test("keeps the app shell when a page fails to load", async ({ page }) => {
  const loaded = new Set<string>()
  const record = (request: { url(): string }) => loaded.add(request.url())
  page.on("request", record)
  await page.goto("/")
  await settle(page)
  page.off("request", record)
  // Scripts not loaded yet fail from now on, as when a deploy removed the old chunks.
  // A router may reload once to recover; the scripts it already had still load.
  await page.route("**/assets/*.js", (route) => (loaded.has(route.request().url()) ? route.continue() : route.abort()))
  const nav = page.getByRole("navigation", { name: "Main" })
  await nav.getByRole("link", { name: LAZY_PAGE }).click()
  await expect(page.getByRole("alert")).toBeVisible()
  await expect(nav).toBeVisible()
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

test.describe("on a 375 px wide screen", () => {
  test.use({ viewport: { width: 375, height: 812 } })

  for (const route of ROUTES) {
    test(`${route} does not scroll horizontally`, async ({ page }) => {
      await page.goto(route)
      await settle(page)
      // A string expression: e2e is type-checked without DOM types.
      const [scrollWidth, clientWidth] = await page.evaluate<[number, number]>(
        "[document.documentElement.scrollWidth, document.documentElement.clientWidth]"
      )
      expect(scrollWidth, `${route} is ${scrollWidth}px wide`).toBeLessThanOrEqual(clientWidth)
    })
  }
})
