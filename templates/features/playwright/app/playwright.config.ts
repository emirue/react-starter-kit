import { defineConfig, devices } from "@playwright/test"

const CI = Boolean(process.env.CI)
// Set E2E_PORT when another app's preview already uses 4173 (locally that server would be reused).
const PORT = Number(process.env.E2E_PORT ?? 4173)

// Browsers are not installed automatically (large download). Run once:
//   {{pmExec}} playwright install chromium
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 1 : undefined,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Tests run against the production build.
  webServer: {
    command: `{{pmRun}} build && {{pmExec}} vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
})
