/**
 * Generates projects with the built CLI and validates them.
 *
 *   node scripts/validate.ts [--only a,b] [--browser] [--shadcn-add] [--cli <path to bin>] [--out <json>]
 *
 * Results are written as JSON (default: docs/validation/results.json). Every
 * entry records the command, exit code and duration that produced it.
 */
import { spawn, spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { parseArgs } from "node:util"

import { FEATURES } from "../src/core/features.ts"
import { SCENARIOS, type Scenario } from "./scenarios.ts"

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

function exec(cmd: string, args: string[], cwd: string, logFile: string, env: Record<string, string> = {}) {
  return new Promise<{ code: number | null; ms: number; output: string }>((done) => {
    const start = Date.now()
    const child = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] })
    let output = ""
    child.stdout.on("data", (d) => (output += d))
    child.stderr.on("data", (d) => (output += d))
    child.on("close", async (code) => {
      await writeFile(logFile, output, { flag: "a" })
      done({ code, ms: Date.now() - start, output })
    })
  })
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

async function browserCheck(url: string, scenario: Scenario): Promise<Check[]> {
  const { chromium } = await import("playwright")
  const browser = await chromium.launch()
  const checks: Check[] = []
  try {
    const page = await browser.newPage()
    const errors: string[] = []
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
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
    checks.push({ name: "browser: no console errors", status: errors.length ? "FAIL" : "PASS", detail: errors.join(" | ") || undefined })
  } finally {
    await browser.close()
  }
  return checks
}

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

  if (pkg.scripts["test:e2e"]) {
    const r = await exec(s.pm, ["run", "test:e2e"], app, log, { CI: "1" })
    checks.push({
      name: "test:e2e (Playwright)",
      status: r.code === 0 ? "PASS" : "FAIL",
      command: `${s.pm} run test:e2e`,
      exitCode: r.code,
      ms: r.ms,
      detail: r.code === 0 ? undefined : r.output.slice(-1500),
    })
  }

  if (values["shadcn-add"] && s.features.includes("shadcn")) {
    // Use the project's own package manager: generated projects pin it in "packageManager".
    const dlx: Record<string, string[]> = { pnpm: ["pnpm", "dlx"], npm: ["npx", "--yes"], yarn: ["npx", "--yes"], bun: ["bunx"] }
    const [dlxCmd, ...dlxArgs] = dlx[s.pm]!
    const add = await exec(dlxCmd!, [...dlxArgs, "shadcn@latest", "add", "accordion", "--yes"], app, log)
    const tc = add.code === 0 ? await exec(s.pm, ["run", "typecheck"], app, log) : add
    const build = tc.code === 0 ? await exec(s.pm, ["run", "build"], app, log) : tc
    const shadcnVersion = spawnSync("npm", ["view", "shadcn@latest", "version"], { encoding: "utf8" }).stdout.trim() || "?"
    const ok = add.code === 0 && tc.code === 0 && build.code === 0 && existsSync(join(app, "src/components/ui/accordion.tsx"))
    checks.push({
      name: "shadcn add accordion + typecheck + build",
      status: ok ? "PASS" : "FAIL",
      command: `${[dlxCmd, ...dlxArgs].join(" ")} shadcn@latest add accordion --yes (resolved shadcn ${shadcnVersion})`,
      exitCode: build.code,
      detail: ok ? undefined : build.output.slice(-1500),
    })
  }

  if (s.features.includes("docker")) checks.push(...(await dockerCheck(s, cwd, log)))
  if (s.features.includes("github-actions")) {
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
    const server = spawn(cmd!, [...pre, "vite", "preview", "--port", port, "--strictPort"], { cwd: app, stdio: "ignore" })
    try {
      const url = `http://localhost:${port}/`
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
  const r = spawnSync(cmd, args, { encoding: "utf8" })
  return r.status === 0 ? r.stdout.trim().split("\n")[0] : "not found"
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
