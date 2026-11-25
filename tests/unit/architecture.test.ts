// Generated apps follow docs/architecture/frontend-architecture.md. These tests
// check the planned files; lint inside generated apps is checked by scripts/validate.ts.
import { readdir, readFile } from "node:fs/promises"
import { join, posix, relative, sep } from "node:path"

import { describe, expect, it } from "vitest"

import { rawColorClasses, SCENARIOS, vendoredUiFiles } from "../../scripts/scenarios.ts"
import type { CliOptions } from "../../src/cli/options.ts"
import versionsJson from "../../src/config/dependency-versions.json" with { type: "json" }
import { createPlan, type Plan, type Target } from "../../src/core/generate.ts"
import { getPreset } from "../../src/core/presets.ts"
import { resolveConfig } from "../../src/core/resolve-config.ts"

const versions = versionsJson as Record<string, string>
const cli = (o: Partial<CliOptions> = {}): CliOptions => ({
  yes: true,
  install: true,
  git: true,
  verify: true,
  dryRun: false,
  allowWorkspaceChanges: false,
  ...o,
})
const target: Target = { rootDir: "/tmp/my-app", appDir: "/tmp/my-app", projectName: "my-app", appName: "my-app" }

const plans = new Map<string, Promise<Plan>>()
function plan(o: Partial<CliOptions>): Promise<Plan> {
  const key = JSON.stringify(o)
  if (!plans.has(key)) plans.set(key, createPlan(resolveConfig({ cli: cli(o) }), target, { packageManagerVersion: "11.13.0" }))
  return plans.get(key)!
}
const paths = (p: Plan) => p.files.map((f) => f.path)
const content = (p: Plan, path: string) => p.files.find((f) => f.path === path)?.content
const pkg = (p: Plan) => JSON.parse(content(p, "package.json")!)

function expectFiles(p: Plan, ...expected: string[]) {
  expect(paths(p)).toEqual(expect.arrayContaining(expected))
}
/** Entries ending in "/" are directories. */
function expectNoFiles(p: Plan, ...absent: string[]) {
  expect(paths(p).filter((x) => absent.some((a) => (a.endsWith("/") ? x.startsWith(a) : x === a)))).toEqual([])
}
/** An `@/…` import resolves: a file or a folder with index.ts(x). */
function expectModule(p: Plan, specifier: string) {
  const base = `src/${specifier.slice(2)}`
  const candidates = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]
  expect(
    candidates.some((c) => paths(p).includes(c)),
    `${specifier} resolves to one of ${candidates.join(", ")}`
  ).toBe(true)
}
function expectSegment(p: Plan, dir: string) {
  expect(
    paths(p).some((x) => x.startsWith(dir)),
    `${dir} has files`
  ).toBe(true)
}

const MATRIX: [string, Partial<CliOptions>][] = [
  ["minimal", { preset: "minimal" }],
  [
    "minimal + React Router, TanStack Query, tests (no Tailwind)",
    { preset: "minimal", features: ["+react-router", "+tanstack-query", "+testing-library"] },
  ],
  ["theme without shadcn (ui primitives)", { preset: "minimal", features: ["+theme", "+testing-library"] }],
  ["standard", {}],
  ["standard without examples", { examples: false }],
  ["standard with TanStack Router", { router: "tanstack-router" }],
  ["standard with --router none", { router: "none" }],
  ["admin", { preset: "admin" }],
  ["admin with TanStack Router", { preset: "admin", router: "tanstack-router" }],
  ["admin without examples", { preset: "admin", examples: false }],
  ["enterprise", { preset: "enterprise" }],
  [
    "enterprise with TanStack Router, fetch and Radix",
    { preset: "enterprise", router: "tanstack-router", ui: "radix", features: ["+fetch", "-axios"] },
  ],
]

/** Where files under src may live. */
const LOCATIONS = [
  /^src\/(main\.tsx|index\.css|vite-env\.d\.ts)$/,
  /^src\/app\/.+/,
  /^src\/(pages|features)\/[a-z0-9-]+\/(index\.ts|(ui|api|model)\/.+)$/,
  /^src\/shared\/(ui|api|lib|config)\/.+/,
  /^src\/routes\/.+/,
  /^src\/(mocks|test)\/.+/,
]

/** Every slice the generator may create, with the name its index.ts exports. */
const PUBLIC_API: Record<string, string> = {
  "pages/home": "HomePage",
  "pages/dashboard": "DashboardPage",
  "pages/settings": "SettingsPage",
  "pages/not-found": "NotFoundPage",
  "pages/users": "UsersPage",
  "pages/examples": "ExamplesPage",
  "pages/todos-example": "TodosPage",
  "pages/sign-up-example": "SignUpPage",
  "pages/counter-example": "CounterPage",
  "features/switch-theme": "ModeToggle",
}

const IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+)["']([^"']+)["']/gm
const RANK: Record<string, number> = { app: 4, pages: 3, features: 2, entities: 1, shared: 0 }

/** "app", "pages/<slice>", "features/<slice>", "shared", or undefined outside the layers. */
function layerOf(path: string): string | undefined {
  if (/^src\/(app\/|routes\/|main\.tsx$)/.test(path)) return "app"
  const slice = /^src\/(pages|features|entities)\/([^/]+)\//.exec(path)
  if (slice) return `${slice[1]}/${slice[2]}`
  if (path.startsWith("src/shared/")) return "shared"
  return undefined
}

/** Why an import breaks the dependency rules, or undefined when it is allowed. */
function importProblem(path: string, specifier: string): string | undefined {
  const from = layerOf(path)
  if (specifier.startsWith(".")) {
    if (!from || from === "app") return undefined
    const root = from === "shared" ? "src/shared/" : `src/${from}/`
    return posix.join(posix.dirname(path), specifier).startsWith(root) ? undefined : `relative import leaves ${root}`
  }
  if (!specifier.startsWith("@/")) return undefined
  const [layer, slice, ...rest] = specifier.slice(2).split("/")
  if (/^(components|lib|hooks|stores|config|layouts|api)$/.test(layer!)) return "pre-FSD location"
  if (path.startsWith("src/mocks/") || path.startsWith("src/test/")) return undefined
  switch (layer) {
    case "shared":
      return slice && rest.length ? undefined : "shared is imported per module (@/shared/<segment>/<module>)"
    case "test":
      return /\.test\.tsx?$/.test(path) ? undefined : "only tests import src/test"
    case "mocks":
      return from === "app" ? undefined : "only the entry imports src/mocks"
    case "routeTree.gen":
      return from === "app" ? undefined : "only the app imports the route tree"
    case "app":
      return from === "app" ? undefined : `${from ?? path} imports the app layer`
    case "pages":
    case "features":
    case "entities": {
      if (rest.length) return "bypasses the slice's index.ts"
      if (!from) return undefined
      if (from === `${layer}/${slice}`) return "a slice imports itself through @/"
      const fromLayer = from.split("/")[0]!
      return fromLayer === "app" || RANK[fromLayer]! > RANK[layer]! ? undefined : `${from} must not import ${layer}/${slice}`
    }
    default:
      return `unknown alias @/${layer}`
  }
}

describe("generated layout: every configuration", () => {
  it.each(MATRIX)("%s: files under src sit in a layer or an allowed outside location", async (_, o) => {
    const src = paths(await plan(o)).filter((x) => x.startsWith("src/"))
    expect(src.filter((x) => !LOCATIONS.some((re) => re.test(x)))).toEqual([])
    // shared/ui and shared/lib are imported per module.
    expect(src.filter((x) => /^src\/shared\/(ui|lib)\/index\.tsx?$/.test(x))).toEqual([])
  })

  it.each(MATRIX)("%s: every slice is known and exports its public API by name from index.ts", async (_, o) => {
    const p = await plan(o)
    const slices = [...new Set(paths(p).flatMap((x) => /^src\/((?:pages|features)\/[^/]+)\//.exec(x)?.[1] ?? []))]
    for (const slice of slices) {
      expect(Object.keys(PUBLIC_API), `unexpected slice src/${slice}`).toContain(slice)
      const index = content(p, `src/${slice}/index.ts`)
      expect(index, `src/${slice}/index.ts`).toBeDefined()
      expect(index, `src/${slice}/index.ts uses export *`).not.toMatch(/export\s*\*/)
      expect(index, `src/${slice}/index.ts`).toMatch(new RegExp(`export\\s*(type\\s*)?\\{[^}]*\\b${PUBLIC_API[slice]}\\b[^}]*\\}`))
    }
  })

  it.each(MATRIX)("%s: imports follow the layer rules", async (_, o) => {
    const problems = (await plan(o)).files
      .filter((f) => /\.(tsx?|mdx)$/.test(f.path))
      .flatMap((f) =>
        [...f.content.matchAll(IMPORT)].flatMap(([, specifier]) => {
          const why = importProblem(f.path, specifier!)
          return why ? [`${f.path}: "${specifier}" (${why})`] : []
        })
      )
    expect(problems).toEqual([])
  })

  it.each(MATRIX)("%s: tests and stories sit next to the module they cover", async (_, o) => {
    const all = new Set(paths(await plan(o)))
    const orphans = [...all].filter((x) => {
      if (!x.startsWith("src/") || !/\.(test|stories)\.tsx?$/.test(x)) return false
      // Covers Orval's output, which is generated at install time.
      if (x === "src/shared/api/generated-client.test.ts") return false
      const base = x.replace(/\.(test|stories)\.tsx?$/, "")
      return !all.has(`${base}.ts`) && !all.has(`${base}.tsx`)
    })
    expect(orphans).toEqual([])
  })

  it.each(MATRIX)("%s: renders no leftover template directives", async (_, o) => {
    for (const f of (await plan(o)).files) expect(f.content, f.path).not.toMatch(/@(if|else|endif)\b|\{\{\s*\w+\s*\}\}/)
  })
})

describe("generated layout: target tree", () => {
  it("admin with React Router and examples matches the documented tree", async () => {
    const p = await plan({ preset: "admin" })
    expectFiles(
      p,
      "src/main.tsx",
      "src/index.css",
      "src/vite-env.d.ts",
      "src/app/app.tsx",
      "src/app/providers.tsx",
      "src/app/router.tsx",
      "src/app/route-error.tsx",
      "src/app/layouts/admin-layout.tsx",
      "src/app/layouts/examples-layout.tsx",
      "src/app/model/ui-store.ts",
      "src/pages/dashboard/index.ts",
      "src/pages/dashboard/ui/dashboard-page.tsx",
      "src/pages/settings/index.ts",
      "src/pages/settings/ui/settings-page.tsx",
      "src/pages/not-found/index.ts",
      "src/pages/not-found/ui/not-found-page.tsx",
      "src/pages/users/index.ts",
      "src/pages/users/ui/users-page.tsx",
      "src/pages/users/ui/users-table.tsx",
      "src/pages/users/ui/create-user-dialog.tsx",
      "src/pages/examples/index.ts",
      "src/pages/examples/ui/examples-page.tsx",
      "src/pages/todos-example/index.ts",
      "src/pages/todos-example/ui/todos-page.tsx",
      "src/pages/todos-example/ui/todo-list.tsx",
      "src/pages/sign-up-example/index.ts",
      "src/pages/sign-up-example/ui/sign-up-page.tsx",
      "src/pages/sign-up-example/ui/sign-up-form.tsx",
      "src/pages/counter-example/index.ts",
      "src/pages/counter-example/ui/counter-page.tsx",
      "src/pages/counter-example/ui/counter.tsx",
      "src/features/switch-theme/index.ts",
      "src/features/switch-theme/ui/mode-toggle.tsx",
      "src/shared/ui/button.tsx",
      "src/shared/ui/card.tsx",
      "src/shared/ui/input.tsx",
      "src/shared/ui/sidebar.tsx",
      "src/shared/ui/table.tsx",
      "src/shared/ui/page-header.tsx",
      "src/shared/ui/state.tsx",
      "src/shared/ui/error-fallback.tsx",
      "src/shared/ui/page-loader.tsx",
      "src/shared/api/http-client.ts",
      "src/shared/api/api-error.ts",
      "src/shared/api/query-client.ts",
      "src/shared/lib/use-mobile.ts",
      "src/shared/lib/utils.ts",
      "src/shared/config/env.ts",
      "src/test/setup.ts",
      "src/test/render.tsx"
    )
    expectModule(p, "@/shared/lib/theme")
    for (const dir of [
      "users/api/",
      "users/model/",
      "todos-example/api/",
      "todos-example/model/",
      "sign-up-example/api/",
      "sign-up-example/model/",
      "counter-example/model/",
    ]) {
      expectSegment(p, `src/pages/${dir}`)
    }
    expectNoFiles(
      p,
      "src/pages/home/",
      "src/app/layouts/root-layout.tsx",
      "src/routes/",
      "src/app/error-boundary.tsx",
      "src/shared/api/orval-mutator.ts",
      "src/mocks/",
      ".storybook/"
    )
    // Lazy routes load page indexes.
    expect(content(p, "src/app/router.tsx")).toContain('import("@/pages/users")')
  })

  it("enterprise adds the error boundary, Orval and MSW in their layers", async () => {
    const p = await plan({ preset: "enterprise" })
    expectFiles(
      p,
      "src/app/error-boundary.tsx",
      "src/shared/api/orval-mutator.ts",
      "src/mocks/handlers.ts",
      "src/mocks/browser.ts",
      "src/mocks/node.ts"
    )
    const orval = content(p, "orval.config.ts")!
    expect(orval).toContain("./src/shared/api/generated/")
    expect(orval).toContain("./src/shared/api/orval-mutator.ts")
    expect(orval).not.toMatch(/src\/(api|lib)\//)
  })

  it("standard with React Router has the home page, the examples and the root layout", async () => {
    const p = await plan({})
    expectFiles(
      p,
      "src/app/app.tsx",
      "src/app/providers.tsx",
      "src/app/router.tsx",
      "src/app/route-error.tsx",
      "src/app/layouts/root-layout.tsx",
      "src/app/layouts/examples-layout.tsx",
      "src/pages/home/index.ts",
      "src/pages/home/ui/home-page.tsx",
      "src/pages/not-found/index.ts",
      "src/pages/examples/index.ts",
      "src/pages/todos-example/index.ts",
      "src/pages/sign-up-example/index.ts",
      "src/pages/counter-example/index.ts",
      "src/features/switch-theme/index.ts",
      "src/shared/ui/page-header.tsx",
      "src/shared/ui/state.tsx",
      "src/shared/ui/error-fallback.tsx",
      "src/shared/ui/page-loader.tsx",
      "src/shared/api/http-client.ts",
      "src/shared/api/api-error.ts",
      "src/shared/api/query-client.ts",
      "src/shared/lib/utils.ts",
      "src/shared/config/env.ts",
      "src/test/render.tsx"
    )
    expectModule(p, "@/shared/lib/theme")
    expectNoFiles(
      p,
      "src/pages/dashboard/",
      "src/pages/settings/",
      "src/pages/users/",
      "src/app/model/",
      "src/app/layouts/admin-layout.tsx",
      "src/routes/",
      "src/shared/lib/use-mobile.ts"
    )
    expect(content(p, "src/app/app.tsx")).toMatch(/export function App\(/)
  })

  it("the todos page takes no props and reads ?filter= itself, with both routers", async () => {
    for (const router of ["react-router", "tanstack-router"] as const) {
      const p = await plan({ router })
      expect(content(p, "src/pages/todos-example/ui/todos-page.tsx"), router).toMatch(/export function TodosPage\(\)/)
    }
  })

  it("TanStack Router keeps route files thin and binds page slices", async () => {
    const p = await plan({ preset: "admin", router: "tanstack-router" })
    expectFiles(
      p,
      "src/app/router.tsx",
      "src/app/layouts/admin-layout.tsx",
      "src/app/layouts/examples-layout.tsx",
      "src/routes/__root.tsx",
      "src/routes/index.tsx",
      "src/routes/users.tsx",
      "src/routes/settings.tsx",
      "src/routes/examples/todos.tsx",
      "src/pages/dashboard/index.ts",
      "src/pages/users/index.ts"
    )
    expect(content(p, "src/routes/examples/todos.tsx")).toContain('from "@/pages/todos-example"')
    // Markup belongs to pages and layouts, not to route files.
    expect(paths(p).filter((x) => x.startsWith("src/routes/") && content(p, x)!.includes("className"))).toEqual([])
  })

  it("without examples there are no example or users pages", async () => {
    for (const preset of ["standard", "admin"] as const) {
      const p = await plan({ preset, examples: false })
      expectNoFiles(
        p,
        "src/pages/examples/",
        "src/pages/todos-example/",
        "src/pages/sign-up-example/",
        "src/pages/counter-example/",
        "src/pages/users/",
        "src/app/layouts/examples-layout.tsx"
      )
      expectFiles(p, "src/pages/not-found/index.ts", preset === "admin" ? "src/pages/dashboard/index.ts" : "src/pages/home/index.ts")
    }
  })

  it("--router none generates no example pages even with examples on", async () => {
    const p = await plan({ router: "none", examples: true })
    expectFiles(p, "src/app/app.tsx", "src/pages/home/index.ts", "src/pages/home/ui/home-page.tsx")
    expect(paths(p).filter((x) => /^src\/pages\/(examples|[^/]+-example)\//.test(x))).toEqual([])
    expectNoFiles(p, "src/pages/not-found/", "src/app/router.tsx", "src/app/layouts/", "src/routes/")
    expect(content(p, "src/pages/home/ui/home-page.tsx")).not.toContain("/examples")
  })

  it("minimal has only the app, the home page and the entry files", async () => {
    const p = await plan({ preset: "minimal" })
    expectFiles(p, "src/main.tsx", "src/app/app.tsx", "src/pages/home/index.ts", "src/pages/home/ui/home-page.tsx")
    expectNoFiles(p, "src/shared/ui/", "src/features/", "src/test/", "src/pages/not-found/")
  })

  it("UI primitives without shadcn still provide the shared state components", async () => {
    const p = await plan({ preset: "minimal", features: ["+react-router", "+tanstack-query", "+testing-library"] })
    expectFiles(p, "src/shared/ui/button.tsx", "src/shared/ui/state.tsx", "src/shared/ui/page-header.tsx", "src/test/render.tsx")
  })

  // role="status" takes its name from aria-label only, never from its content.
  it.each([
    ["with Tailwind", { preset: "minimal", features: ["+tailwind", "+react-router", "+tanstack-query", "+testing-library"] }],
    ["without Tailwind", { preset: "minimal", features: ["+react-router", "+tanstack-query", "+testing-library"] }],
  ] as [string, Partial<CliOptions>][])("LoadingState %s names its status region with the label", async (_, o) => {
    const state = content(await plan(o), "src/shared/ui/state.tsx")!
    const loading = state.slice(state.indexOf("export function LoadingState"), state.indexOf("export function ErrorState"))
    const statusTags = loading.match(/<\w+[^>]*role="status"[^>]*>/g) ?? []
    expect(statusTags).not.toEqual([])
    for (const tag of statusTags) expect(tag).toContain("aria-label={label}")
  })
})

describe("generated configuration", () => {
  it("components.json points shadcn/ui at shared/ui and shared/lib", async () => {
    for (const o of [{}, { preset: "admin", ui: "radix" }] as Partial<CliOptions>[]) {
      expect(JSON.parse(content(await plan(o), "components.json")!).aliases).toEqual({
        components: "@/shared/ui",
        ui: "@/shared/ui",
        utils: "@/shared/lib/utils",
        lib: "@/shared/lib",
        hooks: "@/shared/lib",
      })
    }
  })

  it("pins the ESLint architecture plugins chosen in the spec", () => {
    expect(versions["eslint-plugin-boundaries"]).toBe("7.4.4")
    expect(versions["eslint-import-resolver-typescript"]).toBe("4.4.5")
  })

  it.each([
    ["minimal", { preset: "minimal" }],
    ["standard", {}],
    ["enterprise", { preset: "enterprise" }],
  ] as [string, Partial<CliOptions>][])("%s: lint enforces the layers with boundaries and the TypeScript resolver", async (_, o) => {
    const p = await plan(o)
    const { devDependencies, scripts } = pkg(p)
    expect(devDependencies["eslint-plugin-boundaries"]).toBe(versions["eslint-plugin-boundaries"])
    expect(devDependencies["eslint-import-resolver-typescript"]).toBe(versions["eslint-import-resolver-typescript"])
    expect(scripts.lint).toBe("eslint .")
    const config = content(p, "eslint.config.js")!
    expect(config).toMatch(/from ["']eslint-plugin-boundaries["']/)
    expect(config).toContain("boundaries/elements")
    expect(config).toContain("boundaries/no-unknown-files")
    expect(config).toMatch(/["']import\/resolver["']\s*:\s*\{[^}]*\btypescript\b/)
    expect(config).not.toContain("src/components")
  })

  it("without ESLint there are no architecture lint packages", async () => {
    const p = await plan({ features: ["-eslint"] })
    const dev = pkg(p).devDependencies
    expect(dev["eslint-plugin-boundaries"]).toBeUndefined()
    expect(dev["eslint-import-resolver-typescript"]).toBeUndefined()
    expectNoFiles(p, "eslint.config.js")
  })
})

describe("storybook feature", () => {
  const DEPS = [
    "storybook",
    "@storybook/react-vite",
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
    "@storybook/addon-vitest",
    "@vitest/browser-playwright",
    "playwright",
  ]
  const SCRIPTS = ["storybook", "build-storybook", "test:storybook"]

  it("is part of the enterprise preset only", () => {
    expect(getPreset("enterprise").features).toContain("storybook")
    for (const id of ["minimal", "standard", "admin"] as const) expect(getPreset(id).features, id).not.toContain("storybook")
  })

  it("enterprise installs Storybook with stories next to components", async () => {
    const p = await plan({ preset: "enterprise" })
    const { devDependencies, scripts } = pkg(p)
    for (const name of [...DEPS, "eslint-plugin-storybook"]) expect(devDependencies[name], name).toBe(versions[name])
    expect(Object.keys(scripts)).toEqual(expect.arrayContaining(SCRIPTS))
    expectFiles(
      p,
      ".storybook/main.ts",
      ".storybook/preview.tsx",
      "src/shared/ui/button.stories.tsx",
      "src/features/switch-theme/ui/mode-toggle.stories.tsx",
      "src/shared/ui/design-tokens.mdx"
    )
    const main = content(p, ".storybook/main.ts")!
    for (const addon of ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-themes", "@storybook/addon-vitest"]) {
      expect(main).toContain(addon)
    }
    // a11y violations fail story tests.
    expect(content(p, ".storybook/preview.tsx")).toMatch(/test:\s*["']error["']/)
  })

  it("adds nothing when not selected", async () => {
    for (const o of [{}, { preset: "admin" }] as Partial<CliOptions>[]) {
      const p = await plan(o)
      const { dependencies, devDependencies, scripts } = pkg(p)
      const installed = Object.keys({ ...dependencies, ...devDependencies })
      expect(installed.filter((n) => n.includes("storybook") || DEPS.includes(n))).toEqual([])
      expect(Object.keys(scripts).filter((s) => s.includes("storybook"))).toEqual([])
      expect(paths(p).filter((x) => x.startsWith(".storybook/") || /\.stories\.tsx$|\.mdx$/.test(x))).toEqual([])
    }
  })

  it("installs the Storybook ESLint plugin only together with ESLint", async () => {
    const withEslint = await plan({ features: ["+storybook"] })
    expect(pkg(withEslint).devDependencies["eslint-plugin-storybook"]).toBe(versions["eslint-plugin-storybook"])
    const withoutEslint = await plan({ features: ["+storybook", "-eslint"] })
    expect(pkg(withoutEslint).devDependencies["eslint-plugin-storybook"]).toBeUndefined()
  })

  it("enables the Storybook ESLint plugin in eslint.config.js", async () => {
    expect(content(await plan({ features: ["+storybook"] }), "eslint.config.js")).toContain("eslint-plugin-storybook")
  })
})

describe("feature requirements", () => {
  it("orval adds msw automatically", () => {
    const c = resolveConfig({ cli: cli({ features: ["+orval"] }) })
    expect(c.features).toEqual(expect.arrayContaining(["orval", "msw"]))
    expect(c.added).toContainEqual({ id: "msw", requiredBy: "orval" })
  })

  it("storybook adds shadcn automatically", () => {
    const c = resolveConfig({ cli: cli({ preset: "minimal", features: ["+storybook"] }) })
    expect(c.features).toEqual(expect.arrayContaining(["storybook", "shadcn", "tailwind"]))
    expect(c.added).toContainEqual({ id: "shadcn", requiredBy: "storybook" })
  })
})

describe("validation scenarios", () => {
  it("CSS markers of the monorepo scenarios come only from packages/ui", async () => {
    const templates = join(import.meta.dirname, "../../templates")
    const files = (await readdir(templates, { recursive: true, withFileTypes: true }))
      .filter((e) => e.isFile())
      .map((e) => relative(templates, join(e.parentPath, e.name)).split(sep).join("/"))
    const markers = [...new Set(SCENARIOS.flatMap((s) => s.cssMustContain ?? []))]
    expect(markers).not.toEqual([])
    for (const marker of markers) {
      const users: string[] = []
      for (const f of files) if ((await readFile(join(templates, f), "utf8")).includes(marker)) users.push(f)
      // Tailwind scans every app file, so any other use would satisfy the check without packages/ui.
      expect(
        users.filter((f) => !f.startsWith("features/pkg-ui/")),
        marker
      ).toEqual([])
      expect(users, marker).not.toEqual([])
    }
  })

  const generated = SCENARIOS.filter((s) => !s.expectExit)

  it("run Storybook with every package manager, and once without Playwright", () => {
    const storybook = generated.filter((s) => s.features.includes("storybook"))
    expect(new Set(storybook.map((s) => s.pm))).toEqual(new Set(["pnpm", "npm", "yarn", "bun"]))
    expect(storybook.some((s) => !s.features.includes("playwright"))).toBe(true)
  })

  it("run the examples with TanStack Router and without Tailwind", () => {
    const match = generated.filter(
      (s) =>
        s.features.includes("tanstack-router") &&
        s.features.includes("tanstack-query") &&
        !s.features.includes("tailwind") &&
        !s.args.includes("--no-examples")
    )
    expect(match.map((s) => s.name)).not.toEqual([])
  })
})

describe("validation helpers: design-system colors", () => {
  it("finds raw palette classes and arbitrary hex/rgb colors", () => {
    const source = `<div className="bg-gray-500 hover:text-red-600 bg-white border-[#fff] text-[rgb(0_0_0)]" />`
    expect(rawColorClasses(source)).toEqual(["bg-gray-500", "text-red-600", "bg-white", "[#fff]", "[rgb(0_0_0)]"])
  })

  it("accepts design tokens, anchors and non-color arbitrary values", () => {
    const source = `<a href="#main" className="bg-background text-muted-foreground border-destructive/40 bg-primary/10 aria-[current=page]:bg-muted [&_svg]:size-4" />`
    expect(rawColorClasses(source)).toEqual([])
  })

  it("exempts vendored shadcn/ui files only when shadcn generates them", () => {
    expect(vendoredUiFiles(["tailwind", "theme"]).size).toBe(0)
    const shadcn = vendoredUiFiles(["shadcn"])
    expect(shadcn.has("src/shared/ui/button.tsx")).toBe(true)
    expect(shadcn.has("src/shared/ui/state.tsx")).toBe(false)
    expect(shadcn.has("src/shared/ui/sidebar.tsx")).toBe(false)
    expect(vendoredUiFiles(["shadcn", "admin-layout"]).has("src/shared/ui/sidebar.tsx")).toBe(true)
  })
})
