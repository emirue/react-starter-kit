import { defineConfig, devices } from "@playwright/test"

const CI = Boolean(process.env.CI)

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
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Tests run against the production build.
  webServer: {
    command: "{{pmRun}} build && {{pmExec}} vite preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
})
