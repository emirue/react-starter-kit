// @if vitest
/// <reference types="vitest/config" />
// @endif
import { resolve } from "node:path"

// @if tanstack-router
import { tanstackRouter } from "@tanstack/router-plugin/vite"
// @endif
// @if tailwind
import tailwindcss from "@tailwindcss/vite"
// @endif
import react from "@vitejs/plugin-react"
// @if vite-proxy
import { defineConfig, loadEnv } from "vite"
// @else
import { defineConfig } from "vite"
// @endif

// https://vite.dev/config/
// @if vite-proxy
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "VITE_")
  return {
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
        "@": resolve(import.meta.dirname, "./src"),
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
    // @if vitest
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
  }
})
// @else
export default defineConfig({
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
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
  // @if vitest
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
})
// @endif
