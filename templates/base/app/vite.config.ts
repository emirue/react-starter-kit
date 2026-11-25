// @if vitest
/// <reference types="vitest/config" />
// @endif
import { realpathSync } from "node:fs"
import { resolve } from "node:path"

// @if storybook
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin"
// @endif
// @if tanstack-router
import { tanstackRouter } from "@tanstack/router-plugin/vite"
// @endif
// @if tailwind
import tailwindcss from "@tailwindcss/vite"
// @endif
import react from "@vitejs/plugin-react"
// @if storybook
import { playwright } from "@vitest/browser-playwright"
// @endif
// @if vite-proxy
import { defineConfig, loadEnv } from "vite"
// @else
import { defineConfig } from "vite"
// @endif

// The project directory by its real path. From a short (8.3) Windows path such as C:\Users\RUNNER~1,
// Vitest would otherwise load test files by their long path and setup files and "@/" imports by the short one.
const root = realpathSync.native(import.meta.dirname)

// https://vite.dev/config/
// @if vite-proxy
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, "VITE_")
  return {
    root,
    // @if tanstack-router
    plugins: [
      tanstackRouter({ target: "react", autoCodeSplitting: true }),
      react(),
      // @if tailwind
      tailwindcss(),
      // @endif
    ],
    // @endif
    // @if !tanstack-router && tailwind
    plugins: [react(), tailwindcss()],
    // @endif
    // @if !tanstack-router && !tailwind
    plugins: [react()],
    // @endif
    resolve: {
      alias: {
        "@": resolve(root, "src"),
      },
    },
    server: {
      // Development only. In production, serve the API from the same origin
      // or set VITE_API_BASE_URL to its public URL.
      proxy: {
        "/api": {
          target: env.VITE_PROXY_TARGET || "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
    // @if vitest && !storybook
    test: {
      environment: "jsdom",
      // @if testing-library || msw || theme
      setupFiles: ["./src/test/setup.ts"],
      // @endif
      include: ["src/**/*.test.{ts,tsx}"],
      css: true,
      passWithNoTests: true,
    },
    // @endif
    // @if storybook
    test: {
      passWithNoTests: true,
      projects: [
        {
          // `test` and `test:run`: unit and component tests in jsdom.
          extends: true,
          test: {
            name: "unit",
            environment: "jsdom",
            // @if testing-library || msw || theme
            setupFiles: ["./src/test/setup.ts"],
            // @endif
            include: ["src/**/*.test.{ts,tsx}"],
            css: true,
          },
        },
        {
          // `test:storybook`: every story renders in Chromium; play functions and a11y checks must pass.
          extends: true,
          plugins: [storybookTest({ configDir: resolve(root, ".storybook") })],
          test: {
            name: "storybook",
            browser: { enabled: true, headless: true, provider: playwright(), instances: [{ browser: "chromium" }] },
          },
        },
      ],
    },
    // @endif
  }
})
// @else
export default defineConfig({
  root,
  // @if tanstack-router
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    // @if tailwind
    tailwindcss(),
    // @endif
  ],
  // @endif
  // @if !tanstack-router && tailwind
  plugins: [react(), tailwindcss()],
  // @endif
  // @if !tanstack-router && !tailwind
  plugins: [react()],
  // @endif
  resolve: {
    alias: {
      "@": resolve(root, "src"),
    },
  },
  // @if vitest && !storybook
  test: {
    environment: "jsdom",
    // @if testing-library || msw || theme
    setupFiles: ["./src/test/setup.ts"],
    // @endif
    include: ["src/**/*.test.{ts,tsx}"],
    css: true,
    passWithNoTests: true,
  },
  // @endif
  // @if storybook
  test: {
    passWithNoTests: true,
    projects: [
      {
        // `test` and `test:run`: unit and component tests in jsdom.
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          // @if testing-library || msw || theme
          setupFiles: ["./src/test/setup.ts"],
          // @endif
          include: ["src/**/*.test.{ts,tsx}"],
          css: true,
        },
      },
      {
        // `test:storybook`: every story renders in Chromium; play functions and a11y checks must pass.
        extends: true,
        plugins: [storybookTest({ configDir: resolve(root, ".storybook") })],
        test: {
          name: "storybook",
          browser: { enabled: true, headless: true, provider: playwright(), instances: [{ browser: "chromium" }] },
        },
      },
    ],
  },
  // @endif
})
// @endif
