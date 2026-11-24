import js from "@eslint/js"
// @if eslint-query
import pluginQuery from "@tanstack/eslint-plugin-query"
// @endif
import reactHooks from "eslint-plugin-react-hooks"
import { reactRefresh } from "eslint-plugin-react-refresh"
import { defineConfig, globalIgnores } from "eslint/config"
import globals from "globals"
import tseslint from "typescript-eslint"

export default defineConfig([
  globalIgnores([
    "dist",
    "coverage",
    // @if tanstack-router
    "src/routeTree.gen.ts",
    // @endif
    // @if orval
    "src/api/generated",
    // @endif
    // @if playwright
    "playwright-report",
    "test-results",
    // @endif
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite(),
      // @if eslint-query
      pluginQuery.configs["flat/recommended"],
      // @endif
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  // @if shadcn
  {
    // Vendored shadcn/ui components export variants next to components.
    files: ["src/components/ui/**/*.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  // @endif
  // @if tanstack-router
  {
    // File routes export a Route object next to their component.
    files: ["src/routes/**/*.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  // @endif
  // @if playwright
  {
    files: ["e2e/**/*.ts", "*.config.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
  // @endif
])
