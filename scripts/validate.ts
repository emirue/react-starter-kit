/**
 * Generates projects with the built CLI and validates them.
 *
 *   node scripts/validate.ts [--only a,b] [--browser] [--shadcn-add] [--cli <path to bin>] [--out <json>]
 *
 * Besides install, typecheck, lint, tests and build (run by the CLI), every
 * scenario checks the generated architecture: no raw color classes, and lint
 * rejecting files that break the layer rules. --browser adds axe (light and
 * dark) and a 375 px overflow check on "/" and every deep link.
 *
 * Results are written as JSON (default: docs/validation/results.json). Every
 * entry records the command, exit code and duration that produced it.
 */
import { existsSync } from "node:fs"
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { dirname, join, relative, resolve, sep } from "node:path"
import { parseArgs, stripVTControlCharacters } from "node:util"

import { execa, execaSync } from "execa"

import type { Page } from "playwright"

import { FEATURES } from "../src/core/features.ts"
import { rawColorClasses, SCENARIOS, vendoredUiFiles, type Scenario } from "./scenarios.ts"

type Status = "PASS" | "FAIL" | "SKIPPED"
interface Check {
  name: string
  status: Status
  command?: string
  exitCode?: number | null
  ms?: number
  detail?: string
}

const repo = resolve(import.meta.dirname, "..")
const { values } = parseArgs({
  options: {
    only: { type: "string" },
    browser: { type: "boolean", default: false },
    "shadcn-add": { type: "boolean", default: false },
    cli: { type: "string", default: join(repo, "dist", "index.mjs") },
    out: { type: "string", default: join(repo, "docs", "validation", "results.json") },
  },
})

// execa resolves PATHEXT and .cmd shims on Windows (pnpm, npm), which node:child_process does not.
async function exec(cmd: string, args: string[], cwd: string, logFile: string, env: Record<string, string> = {}) {
  const start = Date.now()
  const r = await execa(cmd, args, { cwd, env, reject: false, all: true, stdin: "ignore" })
  const output = r.all ?? ""
  await writeFile(logFile, output, { flag: "a" })
  return { code: r.exitCode ?? null, ms: Date.now() - start, output }
}

async function waitForHttp(url: string, timeoutMs = 20_000) {
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    try {
      const r = await fetch(url)
      if (r.ok) return true
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  return false
}

// WCAG 2.x A/AA and axe best practices.
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]
const axeSource = () => readFile(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8")

/** Waits for the heading, the network and loading regions, so checks see the final page. */
async function settle(page: Page) {
  await page
    .locator("h1")
    .first()
    .waitFor({ timeout: 10_000 })
    .catch(() => undefined)
  await page.waitForLoadState("networkidle").catch(() => undefined)
  // LoadingState regions; other status regions are live regions that stay in the DOM.
  await page
    .waitForFunction(`!document.querySelector('[role=status][aria-label^="Loading"]')`, undefined, { timeout: 10_000 })
    .catch(() => undefined)
}

async function browserCheck(url: string, scenario: Scenario): Promise<Check[]> {
  const { chromium } = await import("playwright")
  const browser = await chromium.launch()
  const checks: Check[] = []
  try {
    const page = await browser.newPage()
    const errors: string[] = []
    // Without a backend the examples' API requests fail by design (the page shows its error state). Whether
    // Chromium logs that 404 before the next navigation is a race, so those are counted separately.
    const apiFailures: string[] = []
    page.on("console", (m) => {
      if (m.type() !== "error") return
      // With the resource URL: "Failed to load resource" alone does not say what failed.
      const where = m.location().url || page.url()
      const apiFailure = m.text().startsWith("Failed to load resource") && new URL(where, url).pathname.startsWith("/api/")
      ;(apiFailure ? apiFailures : errors).push(`${m.text()} (${where})`)
    })
    page.on("pageerror", (e) => errors.push(e.message))
    await page.goto(url)
    const h1 = await page
      .locator("h1")
      .first()
      .textContent({ timeout: 10_000 })
      .catch(() => null)
    checks.push({ name: "browser: renders heading", status: h1 ? "PASS" : "FAIL", detail: h1 ?? "no <h1>" })
    if (scenario.features.includes("tailwind")) {
      // A Tailwind utility on the page must resolve to a real style.
      // Strings: the repo's tsconfig has no DOM types.
      const bg = await page.evaluate<string>("getComputedStyle(document.body).backgroundColor")
      const hasUtility = await page.evaluate<boolean>(
        '[...document.styleSheets].some((s) => [...s.cssRules].some((r) => r.cssText.includes(".flex")))'
      )
      checks.push({
        name: "browser: Tailwind styles applied",
        status: hasUtility && bg !== "" ? "PASS" : "FAIL",
        detail: `body background ${bg}`,
      })
    }
    if (scenario.cssMustContain) {
      const found = await page.evaluate<boolean>(
        `[...document.styleSheets].some((s) => [...s.cssRules].some((r) => r.cssText.includes(${JSON.stringify(scenario.cssMustContain)})))`
      )
      checks.push({ name: `browser: CSS contains .${scenario.cssMustContain}`, status: found ? "PASS" : "FAIL" })
    }
    for (const path of scenario.deepLinks ?? []) {
      await page.goto(new URL(path, url).toString())
      const ok =
        (await page
          .locator("h1")
          .first()
          .textContent({ timeout: 10_000 })
          .catch(() => null)) !== null
      checks.push({ name: `browser: direct URL ${path}`, status: ok ? "PASS" : "FAIL" })
    }
    checks.push({
      name: "browser: no console errors",
      status: errors.length ? "FAIL" : "PASS",
      detail: errors.join(" | ") || (apiFailures.length ? `not counted (no backend): ${apiFailures.join(" | ")}` : undefined),
    })

    const routes = ["/", ...(scenario.deepLinks ?? [])]
    const axe = await axeSource()
    for (const colorScheme of ["light", "dark"] as const) {
      const context = await browser.newContext({ colorScheme })
      const themed = await context.newPage()
      const found: string[] = []
      for (const path of routes) {
        await themed.goto(new URL(path, url).toString())
        await settle(themed)
        if (colorScheme === "dark" && scenario.features.includes("theme")) {
          // Otherwise the dark run would silently audit the light theme.
          const dark = await themed.evaluate<boolean>("document.documentElement.classList.contains('dark')")
          if (!dark) found.push(`${path}: dark theme not applied`)
        }
        await themed.addScriptTag({ content: axe })
        const violations = await themed.evaluate<string[]>(
          `axe.run(document, { runOnly: { type: "tag", values: ${JSON.stringify(AXE_TAGS)} } })` +
            `.then((r) => r.violations.map((v) => v.id + " x" + v.nodes.length + " at " + v.nodes[0].target.join(" ")))`
        )
        if (violations.length) found.push(`${path}: ${violations.join(", ")}`)
      }
      await context.close()
      checks.push({
        name: `browser: no axe violations (${colorScheme})`,
        status: found.length ? "FAIL" : "PASS",
        detail: found.join(" | ") || `${routes.length} routes`,
      })
    }

    const narrow = await browser.newContext({ viewport: { width: 375, height: 812 } })
    const phone = await narrow.newPage()
    const overflowing: string[] = []
    for (const path of routes) {
      await phone.goto(new URL(path, url).toString())
      await settle(phone)
      const [scrollWidth, clientWidth] = await phone.evaluate<[number, number]>(
        "[document.documentElement.scrollWidth, document.documentElement.clientWidth]"
      )
      if (scrollWidth > clientWidth) overflowing.push(`${path}: ${scrollWidth}px`)
    }
    await narrow.close()
    checks.push({
      name: "browser: no horizontal overflow at 375 px",
      status: overflowing.length ? "FAIL" : "PASS",
      detail: overflowing.join(" | ") || `${routes.length} routes`,
    })
  } finally {
    await browser.close()
  }
  return checks
}

/** Raw palette or hex/rgb color classes anywhere in src, except vendored shadcn/ui files. */
async function designSystemCheck(s: Scenario, app: string): Promise<Check> {
  const vendored = vendoredUiFiles(s.features)
  const found: string[] = []
  for (const entry of await readdir(join(app, "src"), { recursive: true, withFileTypes: true })) {
    const rel = relative(app, join(entry.parentPath, entry.name)).split(sep).join("/")
    if (!entry.isFile() || !/\.tsx?$/.test(rel) || vendored.has(rel)) continue
    const raw = rawColorClasses(await readFile(join(app, rel), "utf8"))
    if (raw.length) found.push(`${rel}: ${[...new Set(raw)].join(" ")}`)
  }
  return { name: "design system: no raw color classes", status: found.length ? "FAIL" : "PASS", detail: found.join(" | ") || undefined }
}

/**
 * Writes files that each break one architecture rule. Lint must fail on every one
 * for the right reason (a boundaries rule, reported for the canary file) and pass
 * again once they are removed.
 */
async function architectureCanaries(s: Scenario, app: string, log: string): Promise<Check[]> {
  const pagesDir = join(app, "src", "pages")
  const slices = existsSync(pagesDir)
    ? (await readdir(pagesDir, { withFileTypes: true }))
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort()
    : []
  const [page, sibling] = slices
  const uiDir = join(pagesDir, page ?? "", "ui")
  const internal =
    page && existsSync(uiDir) ? (await readdir(uiDir)).find((f) => /\.tsx?$/.test(f) && !/\.(test|stories)\./.test(f)) : undefined
  if (!page || !internal)
    return [{ name: "architecture canaries", status: "FAIL", detail: "no page slice with a ui/ module under src/pages" }]

  // Side-effect imports: an unused named import would also fail lint, for the wrong reason.
  const canaries: [rule: string, file: string, code: string][] = [
    ["upward import (shared -> pages)", "src/shared/lib/__canary.ts", `import "@/pages/${page}"\n`],
    [
      "public API bypass (deep import into a page)",
      "src/app/__canary.ts",
      `import "@/pages/${page}/ui/${internal.replace(/\.tsx?$/, "")}"\n`,
    ],
    ["file outside the layers", "src/utils/__canary.ts", "export const canary = true\n"],
  ]
  if (sibling) canaries.push(["sibling slice import (pages -> pages)", `src/pages/${sibling}/ui/__canary.ts`, `import "@/pages/${page}"\n`])

  const checks: Check[] = []
  for (const [rule, file, code] of canaries) {
    const path = join(app, file)
    const createdDir = await mkdir(dirname(path), { recursive: true })
    await writeFile(path, code)
    try {
      const r = await exec(s.pm, ["run", "lint"], app, log)
      const ok = r.code !== 0 && /boundaries\//.test(r.output) && r.output.includes("__canary")
      checks.push({
        name: `lint rejects ${rule}`,
        status: ok ? "PASS" : "FAIL",
        command: `${s.pm} run lint  (with ${file})`,
        exitCode: r.code,
        ms: r.ms,
        detail: ok ? undefined : r.output.slice(-1500),
      })
    } finally {
      await rm(createdDir ?? path, { recursive: true, force: true })
    }
  }
  const clean = await exec(s.pm, ["run", "lint"], app, log)
  checks.push({
    name: "lint passes again without the canaries",
    status: clean.code === 0 ? "PASS" : "FAIL",
    command: `${s.pm} run lint`,
    exitCode: clean.code,
    ms: clean.ms,
    detail: clean.code === 0 ? undefined : clean.output.slice(-1500),
  })
  return checks
}

/**
 * Lints the app from the workspace root, as an editor opened at the root does
 * (ESLint looks up the config from each file). The layer rules must still apply.
 */
async function rootLintChecks(root: string, app: string, log: string): Promise<Check[]> {
  const eslint = join(app, "node_modules", "eslint", "bin", "eslint.js")
  const target = relative(root, app)
  const command = `node ${relative(root, eslint)} ${target}  (from the workspace root)`
  const clean = await exec("node", [eslint, target], root, log)
  const page = (await readdir(join(app, "src", "pages"))).sort()[0]
  const canary = join(app, "src", "shared", "lib", "__canary.ts")
  const createdDir = await mkdir(dirname(canary), { recursive: true })
  await writeFile(canary, `import "@/pages/${page}"\n`)
  try {
    const r = await exec("node", [eslint, target], root, log)
    return [
      {
        name: "ESLint from the workspace root passes",
        status: clean.code === 0 ? "PASS" : "FAIL",
        command,
        exitCode: clean.code,
        ms: clean.ms,
        detail: clean.code === 0 ? undefined : clean.output.slice(-1500),
      },
      {
        name: "ESLint from the workspace root rejects an upward import",
        status: r.code !== 0 && /boundaries\/dependencies/.test(r.output) && r.output.includes("__canary") ? "PASS" : "FAIL",
        command: `${command}  (with src/shared/lib/__canary.ts)`,
        exitCode: r.code,
        ms: r.ms,
        detail: r.output.slice(-600),
      },
    ]
  } finally {
    await rm(createdDir ?? canary, { recursive: true, force: true })
  }
}

const passedTests = (output: string) => Number(/Tests\s+(\d+) passed/.exec(stripVTControlCharacters(output))?.[1] ?? NaN)

// Fails unless the theme decorator put the dark class on <html>, so a clean dark run proves dark styles were checked.
const DARK_CANARY = `import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect } from "storybook/test"

const meta = { title: "Validation/Dark canary", render: () => <p>Dark canary</p> } satisfies Meta
export default meta

export const DarkClassApplied: StoryObj<typeof meta> = {
  play: async () => {
    await expect(document.documentElement.classList.contains("dark")).toBe(true)
  },
}
`

/** Story tests (with their a11y checks) again with the dark theme as the default. */
async function darkStoriesCheck(s: Scenario, app: string, log: string, lightTests: number): Promise<Check> {
  const name = "test:storybook in the dark theme (Storybook)"
  const preview = join(app, ".storybook", "preview.tsx")
  const original = await readFile(preview, "utf8")
  const dark = original.replace('defaultTheme: "light"', 'defaultTheme: "dark"')
  if (dark === original) return { name, status: "FAIL", detail: 'defaultTheme: "light" not found in .storybook/preview.tsx' }
  const canary = join(app, "src", "__dark-canary.stories.tsx")
  await writeFile(preview, dark)
  await writeFile(canary, DARK_CANARY)
  try {
    const r = await exec(s.pm, ["run", "test:storybook"], app, log, { CI: "1" })
    // Every story plus the canary must have run and passed.
    const ok = r.code === 0 && passedTests(r.output) === lightTests + 1
    return {
      name,
      status: ok ? "PASS" : "FAIL",
      command: `${s.pm} run test:storybook  (defaultTheme "dark", with a canary story)`,
      exitCode: r.code,
      ms: r.ms,
      detail: ok ? `${lightTests + 1} tests` : r.output.slice(-1500),
    }
  } finally {
    await writeFile(preview, original)
    await rm(canary, { force: true })
  }
}

// Docker checks need a daemon. Without one (e.g. when the harness itself runs in a container) they are SKIPPED, not failed.
const dockerAvailable = execaSync("docker", ["info"], { reject: false }).exitCode === 0
const noDocker = (name: string): Check => ({ name, status: "SKIPPED", detail: "docker is not available here" })

/** Builds the image, runs it and checks health, SPA fallback and cache headers. */
async function dockerCheck(s: Scenario, cwd: string, log: string): Promise<Check[]> {
  const tag = `produx-validate-${s.name}`
  const context = join(cwd, s.rootPath ?? s.appPath)
  const dockerfile = join(cwd, s.appPath, "Dockerfile")
  const build = await exec("docker", ["build", "-q", "-f", dockerfile, "-t", tag, context], cwd, log)
  const checks: Check[] = [
    {
      name: "docker build",
      status: build.code === 0 ? "PASS" : "FAIL",
      command: `docker build -f ${s.rootPath ? `${s.appPath}/` : ""}Dockerfile .`,
      exitCode: build.code,
      ms: build.ms,
      detail: build.code ? build.output.slice(-1500) : undefined,
    },
  ]
  if (build.code !== 0) return checks
  const port = String(18100 + SCENARIOS.indexOf(s))
  await exec("docker", ["rm", "-f", tag], cwd, log)
  await exec("docker", ["run", "-d", "--name", tag, "-p", `${port}:8080`, tag], cwd, log)
  try {
    let health = ""
    for (let i = 0; i < 40 && health !== "healthy"; i++) {
      await new Promise((r) => setTimeout(r, 1000))
      health = (await exec("docker", ["inspect", "-f", "{{.State.Health.Status}}", tag], cwd, log)).output.trim()
    }
    checks.push({ name: "container becomes healthy (HEALTHCHECK)", status: health === "healthy" ? "PASS" : "FAIL", detail: health })
    const uid = (await exec("docker", ["exec", tag, "id", "-u"], cwd, log)).output.trim()
    checks.push({ name: "runs as non-root", status: uid !== "0" ? "PASS" : "FAIL", detail: `uid ${uid}` })
    const base = `http://localhost:${port}`
    const deep = await fetch(`${base}/deep/link`)
    checks.push({
      name: "SPA fallback for deep links",
      status: deep.status === 200 && (await deep.text()).includes('id="root"') ? "PASS" : "FAIL",
    })
    const html = await (await fetch(base)).text()
    const asset = /\/assets\/[^"]+\.js/.exec(html)?.[0]
    const assetRes = asset ? await fetch(base + asset) : undefined
    checks.push({
      name: "hashed assets cached immutably",
      status: assetRes?.headers.get("cache-control")?.includes("immutable") ? "PASS" : "FAIL",
    })
    const headers = (await fetch(`${base}/deep/link`)).headers
    checks.push({
      name: "security headers on SPA routes",
      status: headers.get("x-content-type-options") === "nosniff" && headers.get("x-frame-options") === "DENY" ? "PASS" : "FAIL",
    })
    const missing = await fetch(`${base}/assets/missing.js`)
    checks.push({
      name: "missing asset is a non-cached 404",
      status: missing.status === 404 && !missing.headers.get("cache-control") ? "PASS" : "FAIL",
    })
  } finally {
    await exec("docker", ["rm", "-f", tag], cwd, log)
    await exec("docker", ["rmi", "-f", tag], cwd, log)
  }
  return checks
}

async function runScenario(s: Scenario, root: string): Promise<{ scenario: string; args: string[]; checks: Check[] }> {
  const cwd = join(root, s.name)
  await mkdir(cwd, { recursive: true })
  const log = join(cwd, "validate.log")
  const checks: Check[] = []
  if (s.setup) await s.setup(cwd)

  const cliArgs = [values.cli!, ...s.args, "--yes"]
  const gen = await exec("node", cliArgs, s.cwd ? join(cwd, s.cwd) : cwd, log)
  const expectFail = s.expectExit !== undefined && s.expectExit !== 0
  checks.push({
    name: expectFail ? `CLI exits with ${s.expectExit}` : "CLI generate + install + verify",
    status: gen.code === (s.expectExit ?? 0) ? "PASS" : "FAIL",
    command: `create-produx-app ${s.args.join(" ")} --yes`,
    exitCode: gen.code,
    ms: gen.ms,
    detail: gen.code === (s.expectExit ?? 0) ? undefined : gen.output.split("\n").slice(-25).join("\n"),
  })
  for (const line of ["Type checking passed", "Lint passed", "Unit tests passed", "Production build passed"]) {
    if (gen.output.includes(line)) checks.push({ name: line, status: "PASS" })
    else if (gen.output.includes(line.replace("passed", "failed"))) checks.push({ name: line.replace("passed", ""), status: "FAIL" })
  }
  if (expectFail && s.verify) checks.push(...(await s.verify(cwd, true)))
  if (expectFail || gen.code !== 0) return { scenario: s.name, args: s.args, checks }
  if (s.verify) checks.push(...(await s.verify(cwd, false)))

  const app = join(cwd, s.appPath)
  const pkg = JSON.parse(await readFile(join(app, "package.json"), "utf8"))
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }

  // Packages of features that were not selected must not be installed.
  const unexpected = FEATURES.filter((f) => !s.features.includes(f.id))
    .flatMap((f) => [...(f.dependencies ?? []), ...(f.devDependencies ?? [])])
    .filter(
      (name) =>
        name in deps &&
        !FEATURES.some((f) => s.features.includes(f.id) && [...(f.dependencies ?? []), ...(f.devDependencies ?? [])].includes(name))
    )
  checks.push({
    name: "no packages of unselected features",
    status: unexpected.length ? "FAIL" : "PASS",
    detail: unexpected.join(", ") || undefined,
  })
  checks.push(await designSystemCheck(s, app))

  if (pkg.scripts["format:check"]) {
    const r = await exec(s.pm, ["run", "format:check"], app, log)
    checks.push({
      name: "format:check",
      status: r.code === 0 ? "PASS" : "FAIL",
      command: `${s.pm} run format:check`,
      exitCode: r.code,
      ms: r.ms,
    })
  }

  if (s.features.includes("eslint")) checks.push(...(await architectureCanaries(s, app, log)))
  const workspaceRoot = s.rootPath ?? s.cwd
  if (workspaceRoot && s.features.includes("eslint")) checks.push(...(await rootLintChecks(join(cwd, workspaceRoot), app, log)))

  if (pkg.scripts["test:e2e"]) {
    // A port of its own: another project's preview on the default 4173 made the run fail ("already used").
    const r = await exec(s.pm, ["run", "test:e2e"], app, log, { CI: "1", E2E_PORT: String(5300 + SCENARIOS.indexOf(s)) })
    checks.push({
      name: "test:e2e (Playwright)",
      status: r.code === 0 ? "PASS" : "FAIL",
      command: `${s.pm} run test:e2e`,
      exitCode: r.code,
      ms: r.ms,
      detail: r.code === 0 ? undefined : r.output.slice(-1500),
    })
  }

  if (s.features.includes("storybook")) {
    let lightTests = NaN
    for (const script of ["build-storybook", "test:storybook"]) {
      const r = await exec(s.pm, ["run", script], app, log, { CI: "1" })
      if (script === "test:storybook" && r.code === 0) lightTests = passedTests(r.output)
      checks.push({
        name: `${script} (Storybook)`,
        status: r.code === 0 ? "PASS" : "FAIL",
        command: `${s.pm} run ${script}`,
        exitCode: r.code,
        ms: r.ms,
        detail: r.code === 0 ? undefined : r.output.slice(-1500),
      })
    }
    if (lightTests > 0) checks.push(await darkStoriesCheck(s, app, log, lightTests))
  }

  if (values["shadcn-add"] && s.features.includes("shadcn")) {
    // Use the project's own package manager: generated projects pin it in "packageManager".
    const dlx: Record<string, string[]> = { pnpm: ["pnpm", "dlx"], npm: ["npx", "--yes"], yarn: ["npx", "--yes"], bun: ["bunx"] }
    const [dlxCmd, ...dlxArgs] = dlx[s.pm]!
    const add = await exec(dlxCmd!, [...dlxArgs, "shadcn@latest", "add", "accordion", "--yes"], app, log)
    const tc = add.code === 0 ? await exec(s.pm, ["run", "typecheck"], app, log) : add
    const build = tc.code === 0 ? await exec(s.pm, ["run", "build"], app, log) : tc
    // The added component must also satisfy the architecture lint rules.
    const lint = build.code === 0 && pkg.scripts.lint ? await exec(s.pm, ["run", "lint"], app, log) : build
    const shadcnVersion = execaSync("npm", ["view", "shadcn@latest", "version"], { reject: false }).stdout.trim() || "?"
    const ok = lint.code === 0 && existsSync(join(app, "src/shared/ui/accordion.tsx"))
    checks.push({
      name: "shadcn add accordion + typecheck + build + lint",
      status: ok ? "PASS" : "FAIL",
      command: `${[dlxCmd, ...dlxArgs].join(" ")} shadcn@latest add accordion --yes (resolved shadcn ${shadcnVersion})`,
      exitCode: lint.code,
      detail: ok ? undefined : lint.output.slice(-1500),
    })
  }

  if (s.features.includes("docker")) checks.push(...(dockerAvailable ? await dockerCheck(s, cwd, log) : [noDocker("docker build + run")]))
  if (s.features.includes("github-actions") && !dockerAvailable) checks.push(noDocker("actionlint (GitHub workflows)"))
  else if (s.features.includes("github-actions")) {
    // Workflows cannot run locally; actionlint checks syntax, expressions and action inputs.
    const root = join(cwd, s.rootPath ?? s.appPath)
    const lint = await exec(
      "docker",
      ["run", "--rm", "-v", `${root}:/repo`, "--workdir", "/repo", "rhysd/actionlint:1.7.12", "-color=false"],
      cwd,
      log
    )
    checks.push({
      name: "actionlint (GitHub workflows)",
      status: lint.code === 0 ? "PASS" : "FAIL",
      command: "actionlint",
      exitCode: lint.code,
      detail: lint.code ? lint.output.slice(-1500) : undefined,
    })
  }

  if (values.browser) {
    const port = String(4300 + SCENARIOS.indexOf(s))
    const [cmd, ...pre] = s.pm === "pnpm" ? ["pnpm", "exec"] : ["npx"]
    // An explicit IPv4 address: "localhost" may resolve to ::1 for fetch and to 127.0.0.1 for Vite (Debian containers).
    const server = execa(cmd!, [...pre, "vite", "preview", "--host", "127.0.0.1", "--port", port, "--strictPort"], {
      cwd: app,
      stdio: "ignore",
      reject: false,
    })
    try {
      const url = `http://127.0.0.1:${port}/`
      if (!(await waitForHttp(url))) checks.push({ name: "preview server starts", status: "FAIL" })
      else {
        checks.push({ name: "preview server starts", status: "PASS" })
        checks.push(...(await browserCheck(url, s)))
      }
    } finally {
      server.kill()
    }
  }
  return { scenario: s.name, args: s.args, checks }
}

const selected = values.only ? SCENARIOS.filter((s) => values.only!.split(",").includes(s.name)) : SCENARIOS
const root = await mkdtemp(join(tmpdir(), "produx-validate-"))
console.log(`Working in ${root}`)
const results = []
for (const s of selected) {
  process.stdout.write(`- ${s.name} … `)
  const r = await runScenario(s, root)
  results.push(r)
  const failed = r.checks.filter((c) => c.status === "FAIL")
  console.log(failed.length ? `FAIL (${failed.map((c) => c.name).join("; ")})` : `PASS (${r.checks.length} checks)`)
}

const previous = existsSync(values.out!) ? JSON.parse(await readFile(values.out!, "utf8")) : { scenarios: {} }
for (const r of results) previous.scenarios[r.scenario] = { ...r, date: new Date().toISOString().slice(0, 10) }
const version = (cmd: string, args = ["--version"]) => {
  const r = execaSync(cmd, args, { reject: false })
  return r.exitCode === 0 ? r.stdout.trim().split("\n")[0] : "not found"
}
previous.environment = {
  cli: version("node", [values.cli!, "--version"]),
  cliPath: values.cli,
  node: process.version,
  platform: `${process.platform} ${process.arch}`,
  pnpm: version("pnpm"),
  npm: version("npm"),
  yarn: version("yarn"),
  bun: version("bun"),
  docker: version("docker"),
}
await mkdir(dirname(values.out!), { recursive: true })
await writeFile(values.out!, `${JSON.stringify(previous, null, 2)}\n`)
console.log(`Results: ${values.out}  (logs kept in ${root})`)
process.exitCode = results.some((r) => r.checks.some((c) => c.status === "FAIL")) ? 1 : 0
