import { createHash } from "node:crypto"
import { existsSync, readdirSync } from "node:fs"
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join, relative } from "node:path"

import { execaSync } from "execa"

import type { PackageManager } from "../src/adapters/package-manager.ts"
import type { CliOptions } from "../src/cli/options.ts"
import versions from "../src/config/dependency-versions.json" with { type: "json" }
import { resolveConfig } from "../src/core/resolve-config.ts"

type Result = { name: string; status: "PASS" | "FAIL"; detail?: string }

export interface Scenario {
  name: string
  args: string[]
  /** Working directory for the CLI, relative to the scenario directory. */
  cwd?: string
  /** Directory of the generated app relative to the scenario directory. */
  appPath: string
  /** Where root-level scripts run (new monorepo root). */
  rootPath?: string
  pm: PackageManager
  /** Resolved features, used to check that unselected packages are absent. */
  features: string[]
  deepLinks?: string[]
  /** A class name the production CSS must contain (e.g. from a shared package). */
  cssMustContain?: string
  expectExit?: number
  setup?: (dir: string) => Promise<void>
  /** `expectedFailure`: the CLI was expected to refuse, so nothing may have changed. */
  verify?: (dir: string, expectedFailure: boolean) => Promise<Result[]>
}

const cli = (o: Partial<CliOptions>): CliOptions => ({
  yes: true,
  install: true,
  git: true,
  verify: true,
  dryRun: false,
  allowWorkspaceChanges: false,
  ...o,
})

function run(cmd: string, args: string[], cwd: string) {
  const r = execaSync(cmd, args, { cwd, reject: false, all: true })
  return { ok: r.exitCode === 0, output: r.all ?? "" }
}

function standalone(name: string, args: string[], o: Partial<CliOptions>, extra: Partial<Scenario> = {}): Scenario {
  const config = resolveConfig({ cli: cli(o) })
  return { name, args: [name, ...args], appPath: name, pm: config.packageManager, features: config.features, ...extra }
}

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
}

/** sha256 of every file outside ignored paths, keyed by relative path. */
async function snapshot(root: string, ignore: (rel: string) => boolean) {
  const out: Record<string, string> = {}
  for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue
    const rel = relative(root, join(entry.parentPath, entry.name))
    if (ignore(rel)) continue
    out[rel] = createHash("sha256")
      .update(await readFile(join(root, rel)))
      .digest("hex")
  }
  return out
}

const ignoreGenerated = (rel: string) =>
  /(^|\/)(node_modules|\.git|dist)(\/|$)/.test(rel) || rel === "pnpm-lock.yaml" || rel.endsWith(".tsbuildinfo")

/** A workspace with another app, a TypeScript backend, a shared package and a .NET directory. */
async function existingWorkspace(dir: string, rootScripts: Record<string, string> = {}) {
  const ws = join(dir, "ws")
  await writeJson(join(ws, "package.json"), {
    name: "ws",
    private: true,
    packageManager: "pnpm@11.13.0",
    scripts: { build: "pnpm -r --if-present run build", ...rootScripts },
  })
  await writeFile(join(ws, "pnpm-workspace.yaml"), "packages:\n  - 'apps/*'\n  - 'packages/*'\n")
  await writeFile(join(ws, ".gitignore"), "node_modules\ndist\n")
  await writeFile(join(ws, "AGENTS.md"), "# Existing workspace rules\n")
  // TypeScript backend (a plain Node HTTP server compiled with tsc).
  await writeJson(join(ws, "apps/api/package.json"), {
    name: "api",
    private: true,
    type: "module",
    scripts: { build: "tsc -p ." },
    dependencies: { "@ws/contracts": "workspace:*" },
    devDependencies: { typescript: versions.typescript, "@types/node": versions["@types/node"] },
  })
  await writeJson(join(ws, "apps/api/tsconfig.json"), {
    compilerOptions: {
      target: "es2023",
      module: "nodenext",
      moduleResolution: "nodenext",
      rootDir: "src",
      outDir: "dist",
      strict: true,
      types: ["node"],
      skipLibCheck: true,
    },
    include: ["src"],
  })
  await mkdir(join(ws, "apps/api/src"), { recursive: true })
  await writeFile(
    join(ws, "apps/api/src/main.ts"),
    'import { createServer } from "node:http"\nimport type { Health } from "@ws/contracts"\n\nconst health: Health = { ok: true }\ncreateServer((_req, res) => res.end(JSON.stringify(health))).listen(3000)\n'
  )
  // Shared TypeScript package.
  await writeJson(join(ws, "packages/contracts/package.json"), {
    name: "@ws/contracts",
    private: true,
    type: "module",
    exports: { ".": { types: "./src/index.ts" } },
  })
  await mkdir(join(ws, "packages/contracts/src"), { recursive: true })
  await writeFile(join(ws, "packages/contracts/src/index.ts"), "export interface Health {\n  ok: boolean\n}\n")
  // Another frontend app with its own build.
  await writeJson(join(ws, "apps/legacy/package.json"), { name: "legacy", private: true, scripts: { build: "node build.mjs" } })
  await writeFile(
    join(ws, "apps/legacy/build.mjs"),
    'import { mkdirSync, writeFileSync } from "node:fs"\nmkdirSync("dist", { recursive: true })\nwriteFileSync("dist/index.html", "<p>legacy</p>")\n'
  )
  // Non-Node backend: not a workspace package.
  await mkdir(join(ws, "services/dotnet-api"), { recursive: true })
  await writeFile(join(ws, "services/dotnet-api/Api.csproj"), '<Project Sdk="Microsoft.NET.Sdk.Web"></Project>\n')
  await writeFile(
    join(ws, "services/dotnet-api/Program.cs"),
    'var app = WebApplication.Create(args);\napp.MapGet("/api/health", () => new { ok = true });\napp.Run();\n'
  )
  if (!run("pnpm", ["install"], ws).ok) throw new Error("fixture install failed")
  run("git", ["init", "--quiet"], ws)
}

interface ExistingOptions {
  rootScripts?: Record<string, string>
  /** Root files this scenario is allowed to change (with approval). */
  allowedChanges?: string[]
}

function existing(
  name: string,
  args: string[],
  o: Partial<CliOptions>,
  extra: Partial<Scenario> = {},
  opts: ExistingOptions = {}
): Scenario {
  const config = resolveConfig({ cli: cli({ mode: "existing-workspace", ...o }), detected: { packageManager: "pnpm", turbo: false } })
  let before: Record<string, string> = {}
  return {
    name,
    args: ["--mode", "existing-workspace", ...args],
    cwd: "ws",
    appPath: join("ws", config.workspace!.appDir),
    pm: "pnpm",
    features: config.features,
    setup: async (dir) => {
      await existingWorkspace(dir, opts.rootScripts)
      before = await snapshot(join(dir, "ws"), ignoreGenerated)
    },
    verify: async (dir, expectedFailure) => {
      const ws = join(dir, "ws")
      const appRel = config.workspace!.appDir
      const after = await snapshot(ws, (rel) => ignoreGenerated(rel) || (!expectedFailure && rel.startsWith(`${appRel}/`)))
      if (expectedFailure) {
        const changed = Object.keys({ ...before, ...after }).filter((k) => before[k] !== after[k])
        return [
          { name: "refused without changing any file", status: changed.length ? "FAIL" : "PASS", detail: changed.join(", ") || undefined },
        ]
      }
      const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((k) => before[k] !== after[k])
      // pnpm 11+ itself records packages younger than minimumReleaseAge in
      // pnpm-workspace.yaml during install. Allow exactly that change, and say so.
      const yaml = await readFile(join(ws, "pnpm-workspace.yaml"), "utf8")
      const onlyReleaseAge =
        yaml.replace(/\nminimumReleaseAgeExclude:\n(\s+- .*\n?)*/, "\n").trimEnd() === "packages:\n  - 'apps/*'\n  - 'packages/*'"
      const unexpected = changed.filter((k) => !(k === "pnpm-workspace.yaml" && onlyReleaseAge) && !(opts.allowedChanges ?? []).includes(k))
      return [
        {
          name: "no files outside the app changed (except the lockfile)",
          status: unexpected.length ? "FAIL" : "PASS",
          detail:
            unexpected.join(", ") || (changed.length ? "pnpm install added minimumReleaseAgeExclude to pnpm-workspace.yaml" : undefined),
        },
        {
          name: "existing TypeScript backend still builds",
          status: run("pnpm", ["--filter", "api", "run", "build"], ws).ok ? "PASS" : "FAIL",
        },
        { name: "existing app still builds", status: run("pnpm", ["--filter", "legacy", "run", "build"], ws).ok ? "PASS" : "FAIL" },
        { name: "no nested git repository", status: existsSync(join(ws, appRel, ".git")) ? "FAIL" : "PASS" },
        { name: "no app-level lockfile", status: existsSync(join(ws, appRel, "pnpm-lock.yaml")) ? "FAIL" : "PASS" },
        {
          name: "existing AGENTS.md kept",
          status: (await readFile(join(ws, "AGENTS.md"), "utf8")) === "# Existing workspace rules\n" ? "PASS" : "FAIL",
        },
      ]
    },
    ...extra,
  }
}

function monorepo(name: string, args: string[], o: Partial<CliOptions>, extra: Partial<Scenario> = {}): Scenario {
  const config = resolveConfig({ cli: cli({ mode: "monorepo", ...o }) })
  return {
    name,
    args: [name, "--mode", "monorepo", ...args],
    appPath: join(name, config.workspace!.appDir),
    rootPath: name,
    pm: "pnpm",
    features: config.features,
    verify: async (dir) => {
      const root = join(dir, name)
      const results: Result[] = [
        { name: "no nested git repository", status: existsSync(join(root, config.workspace!.appDir, ".git")) ? "FAIL" : "PASS" },
        { name: "single root lockfile", status: existsSync(join(root, config.workspace!.appDir, "pnpm-lock.yaml")) ? "FAIL" : "PASS" },
        {
          name: "filtered build (pnpm --filter web build)",
          status: run("pnpm", ["--filter", config.workspace!.appName, "run", "build"], root).ok ? "PASS" : "FAIL",
        },
      ]
      if (config.workspace!.turbo) {
        run("pnpm", ["run", "build"], root)
        const second = run("pnpm", ["run", "build"], root)
        results.push({ name: "Turborepo cache hit on rebuild", status: /FULL TURBO|cache hit/.test(second.output) ? "PASS" : "FAIL" })
      }
      return results
    },
    ...extra,
  }
}

const PALETTE =
  /\b(?:bg|text|border|ring|fill|stroke|from|to|via)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b|\b(?:bg|text)-(?:white|black)\b/g
// Tailwind arbitrary colors: bg-[#fff], text-[rgb(0_0_0)], [color:#000].
const ARBITRARY_COLOR = /\[(?:[a-z-]+:)?(?:#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()[^\]]*\]/g

/** Raw color classes in a source file. Generated code uses design tokens only (docs/architecture/frontend-architecture.md). */
export function rawColorClasses(source: string): string[] {
  return [...source.matchAll(PALETTE), ...source.matchAll(ARBITRARY_COLOR)].map((m) => m[0])
}

/**
 * Generated paths of vendored shadcn/ui files, which are exempt from the color rule.
 * Names come from the templates; the pre-refactor components/ui location is accepted too.
 */
export function vendoredUiFiles(features: string[]): Set<string> {
  const templates = join(import.meta.dirname, "..", "templates", "features")
  const names = ["shadcn", "admin-layout"]
    .filter((id) => features.includes(id))
    .flatMap((id) =>
      ["base", "radix"].flatMap((ui) => ["shared/ui", "components/ui"].map((dir) => join(templates, id, `when-ui-${ui}`, "app/src", dir)))
    )
    .flatMap((dir) => (existsSync(dir) ? readdirSync(dir) : []))
  return new Set(names.flatMap((name) => [`src/shared/ui/${name}`, `src/components/ui/${name}`]))
}

/** Examples need a router: without one, no example page slices may be generated. */
function noExamplePages(name: string) {
  return async (dir: string): Promise<Result[]> => {
    const pages = join(dir, name, "src", "pages")
    const slices = existsSync(pages) ? await readdir(pages) : []
    const examples = slices.filter((slice) => slice === "examples" || slice.endsWith("-example"))
    return [
      {
        name: "no example pages without a router",
        status: examples.length || !slices.includes("home") ? "FAIL" : "PASS",
        detail: `src/pages: ${slices.join(", ") || "missing"}`,
      },
    ]
  }
}

const ROOT_SCRIPTS = { postinstall: `node -e "require('fs').appendFileSync('postinstall.log', 'ran')"` }

const CUSTOM_TOOLING = [
  "+tanstack-table",
  "+eslint-query",
  "+prettier-tailwind",
  "+husky",
  "+lint-staged",
  "+vite-proxy",
  "+env-validation",
  "+github-actions",
]

/** The pre-commit hook must be installed and must pass on the generated files. */
function commitThroughHook(name: string) {
  return async (dir: string): Promise<Result[]> => {
    const root = join(dir, name)
    const hooksPath = run("git", ["config", "core.hooksPath"], root).output.trim()
    run("git", ["add", "-A"], root)
    const commit = run("git", ["-c", "user.name=validate", "-c", "user.email=validate@example.com", "commit", "-m", "init"], root)
    return [
      { name: "husky hooks installed (core.hooksPath)", status: hooksPath === ".husky/_" ? "PASS" : "FAIL", detail: hooksPath },
      {
        name: "git commit runs lint-staged and succeeds",
        status: commit.ok && /lint-staged|Running tasks|eslint/i.test(commit.output) ? "PASS" : "FAIL",
        detail: commit.output.slice(-400),
      },
    ]
  }
}

export const SCENARIOS: Scenario[] = [
  standalone("minimal", ["--preset", "minimal"], { preset: "minimal" }),
  standalone("standard", [], {}, { deepLinks: ["/examples/todos?filter=open", "/examples/sign-up", "/no/such/page"] }),
  standalone("standard-no-examples", ["--no-examples"], { examples: false }, { deepLinks: ["/no/such/page"] }),
  standalone(
    "router-none-examples",
    ["--router", "none", "--examples"],
    { router: "none", examples: true },
    { verify: noExamplePages("router-none-examples") }
  ),
  standalone(
    "standard-radix-tsr-fetch",
    ["--ui", "radix", "--router", "tanstack-router", "--features", "+fetch,-axios"],
    { ui: "radix", router: "tanstack-router", features: ["+fetch", "-axios"] },
    { deepLinks: ["/examples/todos?filter=done", "/no/such/page"] }
  ),
  standalone("standard-npm", ["--package-manager", "npm"], { packageManager: "npm" }),
  standalone("standard-npm-docker-ci", ["--package-manager", "npm", "--features", "+docker,+github-actions"], {
    packageManager: "npm",
    features: ["+docker", "+github-actions"],
  }),
  standalone("standard-bun", ["--package-manager", "bun"], { packageManager: "bun" }),
  // Yarn 1 (classic) enforces engines strictly: run it with a Node.js that meets the project requirement.
  standalone("standard-yarn", ["--package-manager", "yarn"], { packageManager: "yarn" }),
  ...(["base", "radix"] as const).flatMap((ui) =>
    (["react-router", "tanstack-router"] as const).map((router) =>
      standalone(
        `admin-${ui}-${router}`,
        ["--preset", "admin", "--ui", ui, "--router", router],
        { preset: "admin", ui, router },
        {
          deepLinks: ["/users", "/settings", "/examples/todos", "/no/such/page"],
        }
      )
    )
  ),
  standalone(
    "enterprise",
    ["--preset", "enterprise"],
    { preset: "enterprise" },
    { deepLinks: ["/users", "/examples/todos", "/no/such/page"] }
  ),
  standalone(
    "enterprise-fetch-tsr-radix",
    ["--preset", "enterprise", "--ui", "radix", "--router", "tanstack-router", "--features", "+fetch,-axios"],
    { preset: "enterprise", ui: "radix", router: "tanstack-router", features: ["+fetch", "-axios"] },
    { deepLinks: ["/users", "/no/such/page"] }
  ),
  standalone(
    "admin-no-examples",
    ["--preset", "admin", "--no-examples"],
    { preset: "admin", examples: false },
    { deepLinks: ["/settings"] }
  ),
  // Without shadcn/ui, shared/ui holds stand-ins: with Tailwind, and without it (plain CSS).
  standalone(
    "custom-tailwind-primitives",
    ["--preset", "minimal", "--features", "+tailwind,+react-router,+tanstack-query,+vitest,+testing-library"],
    { preset: "minimal", features: ["+tailwind", "+react-router", "+tanstack-query", "+vitest", "+testing-library"] },
    { deepLinks: ["/examples/todos?filter=open", "/no/such/page"] }
  ),
  standalone(
    "custom-primitives-no-tailwind",
    ["--preset", "minimal", "--features", "+react-router,+tanstack-query,+vitest,+testing-library"],
    { preset: "minimal", features: ["+react-router", "+tanstack-query", "+vitest", "+testing-library"] },
    { deepLinks: ["/examples/todos?filter=open", "/no/such/page"] }
  ),
  standalone(
    "custom-primitives-no-tailwind-tsr",
    ["--preset", "minimal", "--features", "+tanstack-router,+tanstack-query,+vitest,+testing-library"],
    { preset: "minimal", features: ["+tanstack-router", "+tanstack-query", "+vitest", "+testing-library"] },
    { deepLinks: ["/examples/todos?filter=open", "/no/such/page"] }
  ),
  // Storybook without Playwright, with each package manager (pnpm is covered by the Enterprise scenarios).
  ...(["npm", "yarn", "bun"] as const).map((pm) =>
    standalone(`storybook-${pm}`, ["--package-manager", pm, "--features", "+storybook"], {
      packageManager: pm,
      features: ["+storybook"],
    })
  ),
  standalone(
    "custom-tooling",
    ["--features", CUSTOM_TOOLING.join(",")],
    { features: CUSTOM_TOOLING },
    { verify: commitThroughHook("custom-tooling") }
  ),
  monorepo(
    "mono-turbo",
    ["--app-name", "web", "--features", "+pkg-shared,+pkg-types,+pkg-ui"],
    { appName: "web", features: ["+pkg-shared", "+pkg-types", "+pkg-ui"] },
    // A class only packages/ui uses: the app's CSS must pick up the shared package's sources.
    { cssMustContain: "border-l-4" }
  ),
  monorepo(
    "mono-enterprise",
    ["--app-name", "web", "--preset", "enterprise", "--features", "+pkg-shared,+pkg-ui"],
    { appName: "web", preset: "enterprise", features: ["+pkg-shared", "+pkg-ui"] },
    { cssMustContain: "border-l-4" }
  ),
  monorepo("mono-no-turbo", ["--app-name", "web", "--no-turbo", "--features", "+pkg-shared"], {
    appName: "web",
    turbo: false,
    features: ["+pkg-shared"],
  }),
  // An app outside apps/ must still be a workspace package, installed and verified.
  monorepo("mono-app-dir", ["--app-name", "web", "--app-dir", "web", "--preset", "minimal"], {
    appName: "web",
    appDir: "web",
    preset: "minimal",
  }),
  // Installing in an existing workspace runs its code, so it needs explicit approval.
  existing("existing-standard", ["web", "--preset", "standard", "--allow-workspace-changes"], { dir: "web", preset: "standard" }),
  existing("existing-install-unapproved", ["web", "--preset", "minimal"], { dir: "web", preset: "minimal" }, { expectExit: 1 }),
  existing("existing-unlisted-dir", ["web", "--app-dir", "tools/web"], { dir: "web", appDir: "tools/web" }, { expectExit: 1 }),
  existing("existing-duplicate-name", ["api"], { dir: "api" }, { expectExit: 1 }),
  existing(
    "existing-unlisted-dir-approved",
    ["web", "--app-dir", "tools/web", "--allow-workspace-changes", "--preset", "minimal"],
    { dir: "web", appDir: "tools/web", preset: "minimal" },
    {},
    { allowedChanges: ["pnpm-workspace.yaml"] }
  ),
  existing("existing-orval", ["web", "--features", "+orval"], { dir: "web", features: ["+orval"] }, { expectExit: 1 }),
  existing(
    "existing-orval-approved",
    ["web", "--features", "+orval", "--allow-workspace-changes"],
    { dir: "web", features: ["+orval"] },
    {},
    { allowedChanges: ["pnpm-workspace.yaml"] }
  ),
  existing(
    "existing-root-scripts",
    ["web", "--preset", "minimal"],
    { dir: "web", preset: "minimal" },
    { expectExit: 1 },
    { rootScripts: ROOT_SCRIPTS }
  ),
  existing(
    "existing-root-scripts-approved",
    ["web", "--preset", "minimal", "--allow-workspace-changes"],
    { dir: "web", preset: "minimal" },
    {},
    { rootScripts: ROOT_SCRIPTS, allowedChanges: ["postinstall.log"] }
  ),
]
