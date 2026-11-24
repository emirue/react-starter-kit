import { Command, CommanderError, Option } from "commander"

import pkg from "../../package.json" with { type: "json" }
import { PACKAGE_MANAGERS, PRESET_IDS, PROJECT_MODES, UI_BASES } from "../core/config-schema.ts"
import type { ProjectMode } from "../core/features.ts"
import type { PresetId } from "../core/presets.ts"
import { ProduxError } from "../utils/errors.ts"
import { validateRelativeDir } from "../utils/project-name.ts"

export const ROUTERS = ["react-router", "tanstack-router", "none"] as const

export interface CliOptions {
  dir?: string
  mode?: ProjectMode
  preset?: PresetId
  packageManager?: (typeof PACKAGE_MANAGERS)[number]
  /** Raw items: "id" replaces the preset's list, "+id" / "-id" modify it. */
  features?: string[]
  ui?: (typeof UI_BASES)[number]
  router?: (typeof ROUTERS)[number]
  workspaceRoot?: string
  appName?: string
  appDir?: string
  turbo?: boolean
  config?: string
  saveConfig?: string | true
  examples?: boolean
  yes: boolean
  install: boolean
  git: boolean
  verify: boolean
  dryRun: boolean
  /** Approves changes to an existing workspace's root files and running its install scripts. */
  allowWorkspaceChanges: boolean
}

export type ParseResult = { kind: "run"; options: CliOptions } | { kind: "exit"; code: number }

function buildProgram(silent: boolean): Command {
  const program = new Command()
    .name("create-produx-app")
    .description("Create a verified React + Vite + TypeScript project, standalone or in a monorepo.")
    .version(pkg.version, "-v, --version")
    .argument("[directory]", "project directory (standalone, new monorepo) or app name (existing workspace)")
    .addOption(new Option("--mode <mode>", "project structure").choices(PROJECT_MODES))
    .addOption(new Option("--preset <preset>", "feature preset").choices(PRESET_IDS))
    .addOption(new Option("--package-manager <pm>", "package manager").choices(PACKAGE_MANAGERS))
    .option("--features <list>", 'comma-separated feature ids; "+id"/"-id" adjust the preset', (v: string) =>
      v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    )
    .addOption(new Option("--ui <base>", "shadcn/ui primitive library").choices(UI_BASES))
    .addOption(new Option("--router <router>", "router").choices(ROUTERS))
    .option("--workspace-root <path>", "existing workspace root (default: detected from the current directory)")
    .option("--app-name <name>", "application package name inside the workspace")
    .option("--app-dir <path>", "application directory relative to the workspace root (default: apps/<app-name>)")
    .option("--turbo", "add Turborepo to a new monorepo")
    .option("--no-turbo", "do not add Turborepo")
    .option("--config <file>", "load a saved produx.config.json")
    .option("--save-config [file]", "save the resolved configuration (default: produx.config.json)")
    .option("--examples", "include example features (default)")
    .option("--no-examples", "generate a clean starter without example features")
    .option("-y, --yes", "accept defaults for anything not given; never prompts", false)
    .option("--no-install", "skip dependency installation (implies no verification)")
    .option("--no-git", "skip git init")
    .option("--no-verify", "skip typecheck, lint, test and build after install")
    .option("--dry-run", "show the plan without writing files or running commands", false)
    .option(
      "--allow-workspace-changes",
      "existing workspace: approve the listed root file changes and the install (it runs workspace code)",
      false
    )
    .exitOverride()
  if (silent) program.configureOutput({ writeOut: () => {}, writeErr: () => {} })
  return program
}

function checkConflicts(o: CliOptions): string[] {
  const issues: string[] = []
  if (o.mode === "standalone") {
    for (const [flag, value] of [
      ["--app-dir", o.appDir],
      ["--app-name", o.appName],
      ["--workspace-root", o.workspaceRoot],
    ] as const) {
      if (value !== undefined) issues.push(`${flag} cannot be used with --mode standalone.`)
    }
    if (o.turbo !== undefined) issues.push("--turbo/--no-turbo cannot be used with --mode standalone.")
  }
  if (o.mode === "existing-workspace" && o.turbo !== undefined) {
    issues.push("--turbo/--no-turbo cannot be used with an existing workspace: Turborepo is detected from turbo.json.")
  }
  if (o.mode === "monorepo" && o.workspaceRoot !== undefined) {
    issues.push("--workspace-root is for --mode existing-workspace. A new monorepo is created in <directory>.")
  }
  const dirError = o.appDir === undefined ? undefined : validateRelativeDir(o.appDir)
  if (dirError) issues.push(`--app-dir ${dirError}.`)
  if (o.allowWorkspaceChanges && o.mode !== undefined && o.mode !== "existing-workspace") {
    issues.push("--allow-workspace-changes only applies to --mode existing-workspace.")
  }
  if (o.dryRun && o.saveConfig !== undefined) issues.push("--dry-run cannot be combined with --save-config (dry runs write nothing).")
  if (o.router && o.features?.some((f) => /^\+?(react-router|tanstack-router)$/.test(f))) {
    issues.push("Choose the router with either --router or --features, not both.")
  }
  return issues
}

export function parseCliArgs(argv: string[], { silent = false } = {}): ParseResult {
  const program = buildProgram(silent)
  try {
    program.parse(argv, { from: "user" })
  } catch (e) {
    if (e instanceof CommanderError) {
      if (e.code === "commander.helpDisplayed" || e.code === "commander.version") return { kind: "exit", code: 0 }
      throw new ProduxError(e.message.replace(/^error: /, ""), "Run create-produx-app --help for usage.")
    }
    throw e
  }
  const raw = program.opts()
  const options: CliOptions = {
    dir: program.args[0],
    mode: raw.mode,
    preset: raw.preset,
    packageManager: raw.packageManager,
    features: raw.features,
    ui: raw.ui,
    router: raw.router,
    workspaceRoot: raw.workspaceRoot,
    appName: raw.appName,
    appDir: raw.appDir,
    turbo: raw.turbo,
    config: raw.config,
    saveConfig: raw.saveConfig,
    examples: raw.examples,
    yes: raw.yes,
    install: raw.install,
    git: raw.git,
    verify: raw.verify,
    dryRun: raw.dryRun,
    allowWorkspaceChanges: raw.allowWorkspaceChanges,
  }
  const issues = checkConflicts(options)
  if (issues.length) throw new ProduxError(issues)
  return { kind: "run", options }
}
