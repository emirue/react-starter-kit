import type { PackageManager } from "../adapters/package-manager.ts"

export type ProjectMode = "standalone" | "monorepo" | "existing-workspace"

export type FeatureGroup = "ui" | "state" | "routing" | "api" | "forms" | "testing" | "quality" | "infra" | "ai" | "app" | "workspace"

export interface FeatureDef {
  id: string
  name: string
  description: string
  group: FeatureGroup
  /** Features that are added automatically when this one is selected. */
  requires?: string[]
  /** At least one of each inner list must be present; the first is added if none is. */
  requiresOneOf?: string[][]
  conflicts?: string[]
  /** Project modes this feature supports. Omitted = all modes. */
  modes?: ProjectMode[]
  /** Package managers this feature was verified with. Omitted = all. */
  packageManagers?: PackageManager[]
  /** Not validated for this release: the resolver refuses it (see docs/validation-report.md). */
  unverified?: true
  /** Package names. Versions come from src/config/dependency-versions.json. */
  dependencies?: string[]
  devDependencies?: string[]
  scripts?: Record<string, string>
}

// Shared packages are created in new monorepos only; existing workspaces keep their own.
const WORKSPACE_MODES: ProjectMode[] = ["monorepo"]

// Registry order is the canonical order of features everywhere (config files,
// package.json, review output), which keeps generation deterministic.
export const FEATURES: FeatureDef[] = [
  // UI and styling
  {
    id: "tailwind",
    name: "Tailwind CSS",
    description: "Tailwind CSS v4 through the official Vite plugin",
    group: "ui",
    dependencies: ["tailwindcss", "@tailwindcss/vite"],
  },
  {
    id: "lucide",
    name: "Lucide React",
    description: "Lucide icon components",
    group: "ui",
    dependencies: ["lucide-react"],
  },
  {
    id: "shadcn",
    name: "shadcn/ui",
    description: "shadcn/ui components on Base UI or Radix UI, with components.json",
    group: "ui",
    requires: ["tailwind", "lucide"],
    dependencies: ["shadcn", "class-variance-authority", "cn", "tw-animate-css", "@fontsource-variable/geist"],
  },
  {
    id: "theme",
    name: "Theme",
    description: "Light, dark and system theme with a persisted preference",
    group: "ui",
    requires: ["tailwind"],
  },
  // State management
  {
    id: "tanstack-query",
    name: "TanStack Query",
    description: "Server state: QueryClient, provider and query key factory",
    group: "state",
    dependencies: ["@tanstack/react-query"],
  },
  {
    id: "tanstack-query-devtools",
    name: "TanStack Query Devtools",
    description: "Query devtools, development builds only",
    group: "state",
    requires: ["tanstack-query"],
    dependencies: ["@tanstack/react-query-devtools"],
  },
  {
    id: "zustand",
    name: "Zustand",
    description: "Shared client state with typed stores and selectors",
    group: "state",
    dependencies: ["zustand"],
  },
  // Routing
  {
    id: "react-router",
    name: "React Router",
    description: "Data router with layouts, nested routes, lazy routes and 404",
    group: "routing",
    conflicts: ["tanstack-router"],
    dependencies: ["react-router"],
  },
  {
    id: "tanstack-router",
    name: "TanStack Router",
    description: "File-based, type-safe routing with the Vite plugin",
    group: "routing",
    conflicts: ["react-router"],
    dependencies: ["@tanstack/react-router"],
    devDependencies: ["@tanstack/router-plugin", "@tanstack/router-cli"],
    // The route tree is generated code; type checking needs it first.
    scripts: {
      build: "tsr generate && tsc -b && vite build",
      typecheck: "tsr generate && tsc -b",
    },
  },
  // API
  {
    id: "fetch",
    name: "Native Fetch",
    description: "API client on the Fetch API: base URL, timeout, cancellation, normalized errors",
    group: "api",
    conflicts: ["axios"],
  },
  {
    id: "axios",
    name: "Axios",
    description: "API client on Axios: base URL, timeout, cancellation, normalized errors",
    group: "api",
    conflicts: ["fetch"],
    dependencies: ["axios"],
  },
  {
    id: "orval",
    name: "Orval",
    description: "Typed TanStack Query hooks generated from a local OpenAPI spec",
    group: "api",
    // This release verifies the TanStack Query output only.
    requires: ["tanstack-query"],
    requiresOneOf: [["fetch", "axios"]],
    devDependencies: ["orval"],
    scripts: { "api:generate": "orval" },
  },
  {
    id: "vite-proxy",
    name: "Vite dev proxy",
    description: "Proxy an API prefix to a local backend during development",
    group: "api",
  },
  // Forms
  {
    id: "react-hook-form",
    name: "React Hook Form",
    description: "Form state management",
    group: "forms",
    dependencies: ["react-hook-form"],
  },
  {
    id: "zod",
    name: "Zod",
    description: "Schema validation",
    group: "forms",
    dependencies: ["zod"],
  },
  {
    id: "hookform-resolvers",
    name: "Hook Form Resolvers",
    description: "Zod schemas as React Hook Form resolvers",
    group: "forms",
    requires: ["react-hook-form", "zod"],
    dependencies: ["@hookform/resolvers"],
  },
  {
    id: "tanstack-table",
    name: "TanStack Table",
    description: "Headless data tables",
    group: "forms",
    dependencies: ["@tanstack/react-table"],
  },
  // Testing
  {
    id: "vitest",
    name: "Vitest",
    description: "Unit and component tests in jsdom",
    group: "testing",
    devDependencies: ["vitest", "jsdom"],
    scripts: { test: "vitest", "test:run": "vitest run" },
  },
  {
    id: "testing-library",
    name: "React Testing Library",
    description: "Component testing with jest-dom matchers and user-event",
    group: "testing",
    requires: ["vitest"],
    devDependencies: ["@testing-library/react", "@testing-library/dom", "@testing-library/jest-dom", "@testing-library/user-event"],
  },
  {
    id: "msw",
    name: "MSW",
    description: "Local API mocks for tests and development",
    group: "testing",
    // Mocks are wired into the test setup and served over the API client.
    requires: ["vitest"],
    requiresOneOf: [["fetch", "axios"]],
    devDependencies: ["msw"],
  },
  {
    id: "playwright",
    name: "Playwright",
    description: "End-to-end smoke tests against the production preview",
    group: "testing",
    devDependencies: ["@playwright/test"],
    scripts: { "test:e2e": "playwright test" },
  },
  // Code quality
  {
    id: "eslint",
    name: "ESLint",
    description: "ESLint flat config with TypeScript, React Hooks and React Refresh rules",
    group: "quality",
    devDependencies: ["eslint", "@eslint/js", "typescript-eslint", "eslint-plugin-react-hooks", "eslint-plugin-react-refresh", "globals"],
    scripts: { lint: "eslint ." },
  },
  {
    id: "eslint-query",
    name: "TanStack Query ESLint Plugin",
    description: "Lint rules for TanStack Query",
    group: "quality",
    requires: ["eslint", "tanstack-query"],
    devDependencies: ["@tanstack/eslint-plugin-query"],
  },
  {
    id: "prettier",
    name: "Prettier",
    description: "Code formatting",
    group: "quality",
    devDependencies: ["prettier"],
    scripts: { format: "prettier --write .", "format:check": "prettier --check ." },
  },
  {
    id: "prettier-tailwind",
    name: "Tailwind CSS Prettier Plugin",
    description: "Sorts Tailwind classes",
    group: "quality",
    requires: ["prettier", "tailwind"],
    devDependencies: ["prettier-plugin-tailwindcss"],
  },
  {
    id: "husky",
    name: "Husky",
    description: "Git hooks",
    group: "quality",
    devDependencies: ["husky"],
    scripts: { prepare: "husky" },
  },
  {
    id: "lint-staged",
    name: "lint-staged",
    description: "Lint and format staged files in the pre-commit hook",
    group: "quality",
    requires: ["husky"],
    requiresOneOf: [["eslint", "prettier"]],
    devDependencies: ["lint-staged"],
  },
  // Infrastructure
  {
    id: "docker",
    name: "Docker + Nginx",
    description: "Multi-stage image serving the build with an unprivileged Nginx",
    group: "infra",
    modes: ["standalone", "monorepo"],
    packageManagers: ["pnpm", "npm"],
  },
  {
    id: "github-actions",
    name: "GitHub Actions",
    description: "CI: install, typecheck, lint, test, build",
    group: "infra",
    packageManagers: ["pnpm", "npm"],
  },
  {
    id: "codeql",
    name: "CodeQL",
    description: "GitHub code scanning workflow",
    group: "infra",
    requires: ["github-actions"],
  },
  // AI development
  {
    id: "claude-md",
    name: "CLAUDE.md",
    description: "Project rules for Claude Code",
    group: "ai",
  },
  {
    id: "agents-md",
    name: "AGENTS.md",
    description: "Project rules for coding agents",
    group: "ai",
  },
  // Application features
  {
    id: "env-validation",
    name: "Environment validation",
    description: "Validate VITE_ environment variables with Zod at startup",
    group: "app",
    requires: ["zod"],
  },
  {
    id: "error-boundary",
    name: "Error Boundary",
    description: "Top-level error boundary with a recovery screen",
    group: "app",
  },
  {
    id: "admin-layout",
    name: "Admin layout",
    description: "Sidebar, header, dashboard, data table, dialogs, toasts and empty/error/loading states",
    group: "app",
    requires: ["shadcn", "theme", "zustand", "tanstack-table", "tanstack-query", "react-hook-form", "zod", "hookform-resolvers"],
    requiresOneOf: [["react-router", "tanstack-router"]],
    dependencies: ["sonner"],
  },
  // Workspace packages
  {
    id: "pkg-shared",
    name: "packages/shared",
    description: "Shared runtime utilities (browser-safe)",
    group: "workspace",
    modes: WORKSPACE_MODES,
  },
  {
    id: "pkg-types",
    name: "packages/types",
    description: "Shared TypeScript types",
    group: "workspace",
    modes: WORKSPACE_MODES,
  },
  {
    id: "pkg-ui",
    name: "packages/ui",
    description: "Shared React UI components",
    group: "workspace",
    modes: WORKSPACE_MODES,
  },
]

export const FEATURE_IDS = FEATURES.map((f) => f.id)

export function getFeature(id: string, registry: FeatureDef[] = FEATURES): FeatureDef | undefined {
  return registry.find((f) => f.id === id)
}
