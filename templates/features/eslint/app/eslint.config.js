import js from "@eslint/js"
// @if eslint-query
import pluginQuery from "@tanstack/eslint-plugin-query"
// @endif
import boundaries from "eslint-plugin-boundaries"
import reactHooks from "eslint-plugin-react-hooks"
import { reactRefresh } from "eslint-plugin-react-refresh"
// @if storybook
import storybook from "eslint-plugin-storybook"
// @endif
import { defineConfig, globalIgnores } from "eslint/config"
import globals from "globals"
import tseslint from "typescript-eslint"

// Architecture rules (Feature-Sliced Design): app -> pages -> features -> entities -> shared.
// Each layer may import only the layers below it, and other slices only through their index.ts.
const SLICED = ["pages", "features", "entities"]
const BELOW = {
  app: ["pages", "features", "entities"],
  pages: ["features", "entities"],
  features: ["entities"],
  entities: [],
}

export default defineConfig([
  globalIgnores([
    "dist",
    "coverage",
    // @if tanstack-router
    "src/routeTree.gen.ts",
    // @endif
    // @if orval
    "src/shared/api/generated",
    // @endif
    // @if msw
    "public/mockServiceWorker.js",
    // @endif
    // @if playwright
    "playwright-report",
    "test-results",
    // @endif
    // @if storybook
    "storybook-static",
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
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      // Without a resolver, `@/` imports are silently left unchecked.
      "import/resolver": { typescript: { alwaysTryTypes: true, project: `${import.meta.dirname}/tsconfig.json` } },
      // Element patterns are relative to this app, also when ESLint runs from a monorepo root (e.g. an editor).
      "boundaries/root-path": import.meta.dirname,
      "boundaries/elements": [
        { type: "app", pattern: ["src/app", "src/routes"] },
        { type: "shared", pattern: "src/shared" },
        ...SLICED.map((layer) => ({ type: layer, pattern: `src/${layer}/*`, capture: ["slice"] })),
      ],
      // Entry files and infrastructure outside the layers.
      "boundaries/ignore": ["src/main.tsx", "src/vite-env.d.ts", "src/mocks/**", "src/test/**", "src/routeTree.gen.ts"],
    },
    rules: {
      "boundaries/no-unknown-files": "error",
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            { from: { element: { type: "app" } }, allow: { to: { element: { type: ["app", "shared"] } } } },
            { from: { element: { type: "shared" } }, allow: { to: { element: { type: "shared" } } } },
            // Inside a slice everything is allowed.
            ...SLICED.map((layer) => ({
              from: { element: { type: layer } },
              allow: { to: { element: { type: layer, captured: { slice: "{{ from.element.captured.slice }}" } } } },
            })),
            // Lower slices only through their public API; shared freely.
            ...Object.entries(BELOW).map(([layer, lower]) => ({
              from: { element: { type: layer } },
              allow: {
                to: [
                  ...lower.map((type) => ({ element: { type, fileInternalPath: "index.ts" } })),
                  { element: { type: "shared" } },
                ],
              },
            })),
            // Entities reference each other only through @x files.
            {
              from: { element: { type: "entities" } },
              allow: { to: { element: { type: "entities", fileInternalPath: "@x/{{ from.element.captured.slice }}.ts" } } },
            },
          ],
        },
      ],
    },
  },
  // @if storybook
  ...storybook.configs["flat/recommended"],
  {
    // The addon check reads ./package.json from the cwd by default: wrong when ESLint runs from a monorepo root.
    files: [".storybook/main.ts"],
    rules: {
      "storybook/no-uninstalled-addons": ["error", { packageJsonLocation: `${import.meta.dirname}/package.json` }],
    },
  },
  // @endif
  // @if shadcn
  {
    // Vendored shadcn/ui components export variants next to components.
    files: ["src/shared/ui/**/*.tsx"],
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
