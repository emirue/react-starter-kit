import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { basename, dirname, join, relative, resolve, sep } from "node:path"

import * as p from "@clack/prompts"

import { PM, pmFromUserAgent, recordedPmVersion } from "../adapters/package-manager.ts"
import type { CliOptions } from "../cli/options.ts"
import { promptForOptions } from "../cli/prompts.ts"
import { ProduxError } from "../utils/errors.ts"
import { commandVersion, runCommand, stopRunningCommands } from "../utils/exec.ts"
import { satisfies } from "../utils/node-version.ts"
import { toValidPackageName, validatePackageName } from "../utils/project-name.ts"
import { assertWritableTarget, Journal, writeFiles } from "./apply.ts"
import { CONFIG_FILE_NAME, parseConfigFile, serializeConfig, type ConfigFile } from "./config-schema.ts"
import { createPlan, NODE_REQUIREMENT, type Target } from "./generate.ts"
import { resolveConfig, withConfigFileAnswers, type ProjectConfig } from "./resolve-config.ts"
import {
  addWorkspaceGlob,
  detectWorkspace,
  ensureAllowBuild,
  excludingGlob,
  globMatches,
  isInside,
  type WorkspaceInfo,
} from "./workspace.ts"

type Status = "passed" | "failed" | "skipped"
interface StepResult {
  label: string
  status: Status
  detail?: string
}

const VERIFY_SCRIPTS: [script: string, label: string][] = [
  ["typecheck", "Type checking"],
  ["lint", "Lint"],
  ["test:run", "Unit tests"],
  ["build", "Production build"],
]
const DONE: Record<string, string> = {
  "Installing dependencies": "Dependencies installed",
  "Generating the API client": "API client generated",
  "Formatting files": "Files formatted",
}

async function loadConfigFile(path: string): Promise<ConfigFile> {
  let raw: unknown
  try {
    raw = JSON.parse(await readFile(path, "utf8"))
  } catch (e) {
    throw new ProduxError(`Cannot read config ${path}: ${(e as Error).message}`)
  }
  return parseConfigFile(raw)
}

function requireName(name: string, what: string): string {
  const error = validatePackageName(name)
  if (error) throw new ProduxError(`Invalid ${what} "${name}": ${error}`, `Try "${toValidPackageName(name) || "my-app"}".`)
  return name
}

function resolveTarget(config: ProjectConfig, o: CliOptions, cwd: string, ws: WorkspaceInfo | undefined): Target {
  if (config.mode === "existing-workspace") {
    if (!ws) throw new ProduxError("No workspace found.")
    const appName = requireName(config.workspace!.appName, "application name")
    const appDir = resolve(ws.root, config.workspace!.appDir)
    if (!isInside(ws.root, appDir) || appDir === ws.root) {
      throw new ProduxError(`--app-dir must point inside the workspace root ${ws.root}.`)
    }
    const clash = ws.packages.find((x) => x.name === appName)
    if (clash) throw new ProduxError(`The workspace already has a package named "${appName}" (${clash.dir}).`, "Choose another --app-name.")
    return { rootDir: ws.root, appDir, projectName: basename(ws.root), appName }
  }
  if (!o.dir) {
    throw new ProduxError("Missing project directory.", "Pass it as the first argument, for example: create-produx-app my-app")
  }
  const rootDir = resolve(cwd, o.dir)
  const projectName = requireName(basename(rootDir), "project name")
  if (config.mode === "standalone") return { rootDir, appDir: rootDir, projectName, appName: projectName }
  const appName = requireName(config.workspace!.appName, "application name")
  return { rootDir, appDir: resolve(rootDir, config.workspace!.appDir), projectName, appName }
}

function toConfigFile(config: ProjectConfig): ConfigFile {
  return {
    schemaVersion: 1,
    mode: config.mode,
    packageManager: config.packageManager,
    preset: config.preset,
    features: config.features,
    ui: config.features.includes("shadcn") ? { ...config.ui } : undefined,
    workspace: config.workspace ? { ...config.workspace } : undefined,
    examples: config.examples,
  }
}

const rel = (from: string, to: string) => relative(from, to).split(sep).join("/") || "."

function printReview(config: ProjectConfig, target: Target, files: string[], changes: string[], outside: string[], steps: string[]) {
  const modeLabel = { standalone: "Standalone", monorepo: "New monorepo", "existing-workspace": "Existing workspace" }[config.mode]
  const lines = [
    `Project mode:     ${modeLabel}`,
    `Destination:      ${config.mode === "existing-workspace" ? target.appDir : target.rootDir}`,
    config.mode !== "standalone" ? `Application:      ${target.appName} (${config.workspace!.appDir})` : undefined,
    `Package manager:  ${config.packageManager}`,
    config.mode === "monorepo" ? `Turborepo:        ${config.workspace!.turbo ? "Enabled" : "Disabled"}` : undefined,
    `Preset:           ${config.preset}`,
    `Features:         ${config.features.join(", ") || "(none)"}`,
    config.added.length ? `Added for you:    ${config.added.map((a) => `${a.id} (required by ${a.requiredBy})`).join(", ")}` : undefined,
    config.features.includes("shadcn")
      ? `UI:               shadcn/ui ${config.ui.base === "base" ? "Base UI" : "Radix UI"}, ${config.ui.style}`
      : undefined,
    `Examples:         ${config.examples ? "included" : config.features.some((f) => f.endsWith("-router")) ? "not included" : "not included (examples need a router)"}`,
    `Files to create:  ${files.length}`,
    changes.length ? `Existing files to modify:\n${changes.map((c) => `  - ${c}`).join("\n")}` : undefined,
    outside.length ? `Also writes:      ${outside.join(", ")}` : undefined,
    `Plan:             ${steps.join(" → ")}`,
  ]
  p.note(lines.filter(Boolean).join("\n"), "Review")
}

function tail(output: string, lines = 40) {
  return output.trimEnd().split("\n").slice(-lines).join("\n")
}

export async function run(o: CliOptions, cwd = process.cwd()): Promise<number> {
  const interactive = !o.yes && Boolean(process.stdin.isTTY && process.stdout.isTTY)
  p.intro("Create Produx App")

  if (!satisfies(process.version, ">=22.12.0")) {
    throw new ProduxError(`create-produx-app needs Node.js >=22.12.0 (current ${process.version}).`)
  }

  if (!satisfies(process.version, NODE_REQUIREMENT)) {
    p.log.warn(`Generated projects need Node.js ${NODE_REQUIREMENT} (current ${process.version}). Installation and validation may fail.`)
  }

  const file = o.config ? await loadConfigFile(resolve(cwd, o.config)) : undefined
  const mode = o.mode ?? file?.mode
  let detected: WorkspaceInfo | undefined
  if (mode === "existing-workspace" || (interactive && !mode)) {
    const start = o.workspaceRoot ? resolve(cwd, o.workspaceRoot) : cwd
    detected = await detectWorkspace(start)
    if (o.workspaceRoot && detected && detected.root !== start) {
      throw new ProduxError(`${start} is not a workspace root (the enclosing workspace is ${detected.root}).`)
    }
  }
  if (mode === "existing-workspace" && !detected) {
    throw new ProduxError(
      `No pnpm/npm/yarn/bun workspace found from ${o.workspaceRoot ?? cwd}.`,
      "Run inside the workspace or pass --workspace-root <path>."
    )
  }

  const ua = pmFromUserAgent()
  const opts = interactive
    ? await promptForOptions(withConfigFileAnswers(o, file), {
        detected,
        defaultPm: ua?.name ?? "pnpm",
        filePreset: file?.preset,
        fileFeatures: file?.features,
      })
    : o
  if (opts.mode === "existing-workspace" && !detected) {
    throw new ProduxError("No workspace detected from the current directory.", "Run inside the workspace or pass --workspace-root <path>.")
  }

  const config = resolveConfig({ cli: opts, file, detected, userAgentPm: ua?.name })
  if (config.mode !== "standalone" && config.packageManager !== "pnpm") {
    throw new ProduxError(
      `Monorepo modes are verified with pnpm workspaces only (requested: ${config.packageManager}).`,
      "Use --package-manager pnpm, or create a standalone app."
    )
  }
  if (config.mode === "standalone") {
    const given: [string, unknown][] = [
      ["--app-name", o.appName],
      ["--app-dir", o.appDir],
      ["--turbo/--no-turbo", o.turbo],
      ["--workspace-root", o.workspaceRoot],
    ]
    const ignored = given.filter(([, v]) => v !== undefined).map(([flag]) => flag)
    if (ignored.length) p.log.warn(`${ignored.join(", ")} only apply to a monorepo or an existing workspace (--mode); ignored.`)
  }
  const target = resolveTarget(config, opts, cwd, detected)
  const writeRoot = config.mode === "existing-workspace" ? target.appDir : target.rootDir
  await assertWritableTarget(writeRoot, config.mode === "existing-workspace" ? target.rootDir : undefined)

  const pm = config.packageManager
  let pmVersion = ua?.name === pm ? ua.version : undefined
  if (!pmVersion && !opts.dryRun) pmVersion = await commandVersion(pm)
  if (!pmVersion && opts.install && !opts.dryRun) {
    throw new ProduxError(
      `${pm} was not found on PATH.`,
      `Install ${pm} (see its official docs) or use --package-manager. create-produx-app never installs package managers globally.`
    )
  }
  if (pmVersion) {
    const recorded = recordedPmVersion(pm, pmVersion)
    if (recorded.replaced) {
      p.log.warn(
        `${pm} ${recorded.replaced} is deprecated as a broken release (CI setup refuses it). The project records ${pm}@${recorded.version}, which ${pm} switches to inside the project. Upgrade ${pm} to remove this warning.`
      )
    }
    pmVersion = recorded.version
  }

  const externalConfigPath = typeof opts.saveConfig === "string" ? resolve(cwd, opts.saveConfig) : undefined
  if (externalConfigPath && isInside(writeRoot, externalConfigPath)) {
    throw new ProduxError(
      `--save-config ${opts.saveConfig} is inside the new project and could replace a generated file.`,
      "Use --save-config without a path to save produx.config.json in the project, or choose a path outside it."
    )
  }
  if (externalConfigPath && existsSync(externalConfigPath)) {
    throw new ProduxError(
      `${externalConfigPath} already exists.`,
      "Choose another --save-config path; existing files are never overwritten."
    )
  }

  const plan = await createPlan(config, target, { packageManagerVersion: pmVersion })
  if (opts.saveConfig === true) {
    plan.files.push({ path: rel(target.rootDir, join(writeRoot, CONFIG_FILE_NAME)), content: serializeConfig(toConfigFile(config)) })
  }

  // Existing workspace: register the app when no glob covers it.
  const changes: { path: string; content: string; label: string }[] = []
  const appRel = rel(target.rootDir, target.appDir)
  const excludedBy = detected && config.mode === "existing-workspace" ? excludingGlob(detected.globs, appRel) : undefined
  if (excludedBy) {
    throw new ProduxError(
      `${appRel} is excluded from the workspace by '${excludedBy}' in ${detected!.configFile}.`,
      "Choose another --app-dir, or remove that exclusion yourself and run the command again."
    )
  }
  if (detected && config.mode === "existing-workspace" && !detected.globs.some((g) => !g.startsWith("!") && globMatches(g, appRel))) {
    const yamlPath = join(detected.root, "pnpm-workspace.yaml")
    if (detected.configFile !== "pnpm-workspace.yaml") {
      throw new ProduxError(
        `${appRel} is not covered by the workspace globs (${detected.globs.join(", ")}).`,
        "Choose an --app-dir that matches them."
      )
    }
    changes.push({
      path: yamlPath,
      content: addWorkspaceGlob(await readFile(yamlPath, "utf8"), appRel),
      label: `pnpm-workspace.yaml: add '${appRel}' to packages`,
    })
  }
  // orval depends on esbuild, whose install script pnpm 11+ only runs when approved.
  if (detected && config.mode === "existing-workspace" && pm === "pnpm" && config.features.includes("orval")) {
    const yamlPath = join(detected.root, "pnpm-workspace.yaml")
    const current = changes.find((c) => c.path === yamlPath)?.content ?? (existsSync(yamlPath) ? await readFile(yamlPath, "utf8") : "")
    const next = ensureAllowBuild(current, "esbuild")
    if (next !== undefined) {
      const existing = changes.find((c) => c.path === yamlPath)
      if (existing) {
        existing.content = next
        existing.label += ", allow esbuild's install script"
      } else changes.push({ path: yamlPath, content: next, label: "pnpm-workspace.yaml: allow esbuild's install script (needed by orval)" })
    }
  }
  const lockfile = join(target.rootDir, PM[pm].lockfile)
  const changeLabels = [...changes.map((c) => c.label)]
  if (config.mode === "existing-workspace" && opts.install) changeLabels.push(`${PM[pm].lockfile}: updated by ${pm} install`)
  // Installing in an existing workspace runs its own root lifecycle scripts.
  // Installing in an existing workspace runs code from that workspace: root lifecycle
  // scripts, .pnpmfile.cjs and its packages' install scripts. It always needs approval.
  const installRunsWorkspaceCode = Boolean(detected) && config.mode === "existing-workspace" && opts.install
  if (installRunsWorkspaceCode) {
    const known = [...detected!.lifecycleScripts.map((s) => `root "${s}"`), ...(detected!.hasPnpmfile ? [".pnpmfile.cjs"] : [])]
    changeLabels.push(
      `${pm} install runs the workspace's install scripts${known.length ? ` (${known.join(", ")}, and any in its packages)` : " (if any)"}`
    )
  }

  // A new monorepo is verified from the root (all packages, in dependency order).
  const verifyAtRoot = config.mode === "monorepo"
  const verifyDir = verifyAtRoot ? target.rootDir : target.appDir
  const manifestPath = verifyAtRoot || appRel === "." ? "package.json" : `${appRel}/package.json`
  const rootScripts = JSON.parse(plan.files.find((f) => f.path === manifestPath)!.content).scripts as Record<string, string | undefined>
  // The root "test" script runs test:run in every package.
  const scripts: Record<string, string | undefined> = verifyAtRoot ? { ...rootScripts, "test:run": rootScripts.test } : rootScripts
  const verifyScript = (s: string) => (verifyAtRoot && s === "test:run" ? "test" : s)
  const willInstall = opts.install && !opts.dryRun
  const willGit = opts.git && config.mode !== "existing-workspace"
  const steps = ["generate files", willGit ? "git init" : undefined, willInstall ? `${pm} install` : undefined]
  if (willInstall && opts.verify) steps.push(...VERIFY_SCRIPTS.filter(([s]) => scripts[s]).map(([s]) => s))

  printReview(
    config,
    target,
    plan.files.map((f) => f.path),
    changeLabels,
    externalConfigPath ? [`${isInside(cwd, externalConfigPath) ? rel(cwd, externalConfigPath) : externalConfigPath} (--save-config)`] : [],
    steps.filter((s): s is string => Boolean(s))
  )
  for (const s of plan.skipped) p.log.warn(`Not written in an existing workspace: ${s.path} (${s.reason})`)
  if (detected && config.mode === "existing-workspace") {
    const ours = new Set(Object.keys(JSON.parse(plan.files.find((f) => f.path === `${appRel}/package.json`)!.content).dependencies ?? {}))
    const devDeps = Object.keys(JSON.parse(plan.files.find((f) => f.path === `${appRel}/package.json`)!.content).devDependencies ?? {})
    for (const d of devDeps) ours.add(d)
    const overridden = detected.overrides.filter((name) => ours.has(name))
    if (overridden.length) {
      p.log.warn(
        `The workspace overrides ${overridden.join(", ")}: the app will get those versions instead of the verified ones. Validation below will show whether they work.`
      )
    }
    if (detected.hasCatalog) p.log.info("The workspace defines pnpm catalogs; the new app pins its own versions and does not use them.")
  }

  // A --save-config file inside the existing workspace is a change to that workspace too.
  const configInWorkspace = Boolean(
    externalConfigPath && detected && config.mode === "existing-workspace" && isInside(detected.root, externalConfigPath)
  )
  if ((changes.length || installRunsWorkspaceCode || configInWorkspace) && !interactive && !opts.dryRun && !opts.allowWorkspaceChanges) {
    throw new ProduxError(
      "Adding this app changes or runs existing workspace files (listed above). --yes does not approve that.",
      changes.length
        ? `Approve with --allow-workspace-changes, run without --yes to confirm interactively, or add '${appRel}' to pnpm-workspace.yaml yourself.`
        : installRunsWorkspaceCode
          ? "Approve with --allow-workspace-changes, run without --yes to confirm interactively, or use --no-install and install yourself."
          : "Approve with --allow-workspace-changes, run without --yes to confirm interactively, or save the configuration outside the workspace."
    )
  }

  if (opts.dryRun) {
    p.log.message(plan.files.map((f) => f.path).join("\n"))
    p.outro("Dry run: nothing was written and no commands were run.")
    return 0
  }

  if (interactive) {
    const ok = await p.confirm({
      message:
        changes.length || installRunsWorkspaceCode
          ? "Create the project and apply the workspace changes listed above?"
          : "Create the project?",
    })
    if (p.isCancel(ok) || !ok) {
      p.cancel("Cancelled. Nothing was written.")
      return 130
    }
  }

  const journal = new Journal()
  // `on`, not `once`: the listener must stay registered while the async
  // rollback runs, or the default SIGINT action kills the process first.
  let cancelling = false
  const onSigint = () => {
    if (cancelling) return
    cancelling = true
    // Stop the running install or check first: it could otherwise write again after the rollback.
    void stopRunningCommands()
      .then(() => journal.rollback())
      .finally(() => {
        p.cancel("Cancelled. Changes made by this run were rolled back.")
        process.exit(130)
      })
  }
  process.on("SIGINT", onSigint)

  const results: StepResult[] = [
    { label: "Configuration resolved", status: "passed" },
    { label: "Feature dependencies validated", status: "passed" },
  ]
  try {
    const prefix = rel(target.rootDir, writeRoot)
    const files = plan.files.map((f) => ({ path: prefix === "." ? f.path : f.path.slice(prefix.length + 1), content: f.content }))
    await writeFiles(writeRoot, files, journal)
    for (const c of changes) await journal.modify(c.path, c.content)
    if (externalConfigPath) await journal.modify(externalConfigPath, serializeConfig(toConfigFile(config)))
  } catch (e) {
    await journal.rollback()
    throw e
  }
  results.push({ label: `Files generated (${plan.files.length})`, status: "passed" })
  p.log.success(`Generated ${plan.files.length} files in ${writeRoot}`)

  if (willGit) {
    const insideRepo = ((d) => {
      for (; dirname(d) !== d; d = dirname(d)) if (existsSync(join(d, ".git"))) return true
      return false
    })(dirname(target.rootDir))
    if (insideRepo) results.push({ label: "Git", status: "skipped", detail: "already inside a git repository" })
    else {
      const r = await runCommand("git", ["init", "--quiet"], target.rootDir)
      results.push({ label: "Git initialized", status: r.ok ? "passed" : "skipped", detail: r.ok ? undefined : "git not available" })
    }
  } else results.push({ label: "Git", status: "skipped", detail: opts.git ? "existing workspace" : "--no-git" })

  // Plain log lines instead of a spinner: clack's spinner exits with code 0 on
  // Ctrl+C in raw mode, which would skip the rollback above.
  const step = async (label: string, [file, ...args]: string[], cwdDir: string) => {
    p.log.step(`${label}…`)
    const r = await runCommand(file!, args, cwdDir, pm === "yarn" ? { YARN_ENABLE_IMMUTABLE_INSTALLS: "false" } : {})
    const done = DONE[label] ?? `${label} passed`
    results.push({ label: r.ok ? done : `${label} failed`, status: r.ok ? "passed" : "failed", detail: r.ok ? undefined : r.command })
    if (r.ok) p.log.success(done)
    else p.log.error(`${label} failed: ${r.command}\n${tail(r.output)}`)
    return r.ok
  }

  let installed = false
  const workspaceYaml = join(target.rootDir, "pnpm-workspace.yaml")
  const yamlBefore = config.mode === "existing-workspace" && existsSync(workspaceYaml) ? await readFile(workspaceYaml, "utf8") : undefined
  if (willInstall) {
    if (config.mode === "existing-workspace") {
      await journal.backup(lockfile)
      if (yamlBefore !== undefined) await journal.backup(workspaceYaml)
    }
    const args = pm === "pnpm" ? ["install", "--no-frozen-lockfile"] : ["install"]
    installed = await step("Installing dependencies", [pm, ...args], target.rootDir)
  } else results.push({ label: "Dependencies", status: "skipped", detail: "--no-install" })

  if (yamlBefore !== undefined && (await readFile(workspaceYaml, "utf8")) !== yamlBefore) {
    p.log.warn(
      `${pm} install changed pnpm-workspace.yaml (usually minimumReleaseAgeExclude entries for packages published in the last day). Review it before committing.`
    )
  }

  const verified = { ran: false, ok: true }
  if (installed) {
    if (config.features.includes("orval"))
      installed = await step("Generating the API client", PM[pm].runScript("api:generate"), target.appDir)
    if (installed && config.features.includes("prettier")) await step("Formatting files", PM[pm].runScript("format"), target.appDir)
    if (installed && opts.verify) {
      verified.ran = true
      for (const [script, label] of VERIFY_SCRIPTS) {
        if (!scripts[script]) continue
        if (!(await step(label, PM[pm].runScript(verifyScript(script)), verifyDir))) verified.ok = false
      }
    } else if (!opts.verify) results.push({ label: "Validation", status: "skipped", detail: "--no-verify" })
  } else if (willInstall) verified.ok = false
  if (!willInstall) results.push({ label: "Validation", status: "skipped", detail: "requires install" })

  process.removeListener("SIGINT", onSigint)

  const icon: Record<Status, string> = { passed: "✓", failed: "✗", skipped: "–" }
  p.note(results.map((r) => `${icon[r.status]} ${r.label}${r.detail ? ` (${r.status}: ${r.detail})` : ""}`).join("\n"), "Result")

  const failed = results.some((r) => r.status === "failed")
  const cd = rel(cwd, config.mode === "existing-workspace" ? target.rootDir : target.rootDir)
  const appScript = (script: string) =>
    config.mode === "standalone" ? `${PM[pm].run} ${script}` : PM[pm].filterRun(target.appName, script)
  const next = [
    cd !== "." ? `cd ${/\s/.test(cd) ? JSON.stringify(cd) : cd}` : undefined,
    !installed ? PM[pm].install.join(" ") : undefined,
    // The app imports the generated client, which only exists after generation.
    !installed && config.features.includes("orval") ? appScript("api:generate") : undefined,
    appScript("dev"),
  ].filter(Boolean)

  if (failed) {
    const created = journal.created.concat(journal.filled)
    p.log.error(
      [
        "Some steps failed. Files were kept so you can inspect them.",
        `Created: ${created.join(", ")}`,
        journal.original.size ? `Modified: ${[...journal.original.keys()].join(", ")}` : undefined,
        config.mode === "existing-workspace"
          ? `To undo: delete ${target.appDir} and restore the modified files with your VCS (e.g. git checkout -- <file>).`
          : `To start over: delete ${target.rootDir}.`,
      ]
        .filter(Boolean)
        .join("\n")
    )
    p.outro("Project created with errors.")
    return 1
  }
  p.note(next.join("\n"), "Next steps")
  p.outro(verified.ran && verified.ok ? "Project created successfully!" : "Project created (not fully verified: see skipped steps above).")
  return 0
}
