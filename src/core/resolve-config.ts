import type { PackageManager } from "../adapters/package-manager.ts"
import type { CliOptions } from "../cli/options.ts"
import { ProduxError } from "../utils/errors.ts"
import type { ConfigFile } from "./config-schema.ts"
import type { ProjectMode } from "./features.ts"
import { getPreset, PRESETS, type PresetId } from "./presets.ts"
import { resolveFeatures } from "./resolve-features.ts"

export interface ProjectConfig {
  mode: ProjectMode
  packageManager: PackageManager
  preset: PresetId
  features: string[]
  /** Features added because something else required them. */
  added: { id: string; requiredBy: string }[]
  ui: { base: "base" | "radix"; style: NonNullable<NonNullable<ConfigFile["ui"]>["style"]> }
  examples: boolean
  workspace?: { appName: string; appDir: string; turbo: boolean }
}

export interface ResolveInput {
  cli: CliOptions
  file?: ConfigFile
  /** From detectWorkspace(), for existing-workspace mode. */
  detected?: { packageManager: PackageManager; turbo: boolean }
  /** The package manager that launched the CLI, if any. */
  userAgentPm?: PackageManager
}

const ROUTER_FEATURES = ["react-router", "tanstack-router"]

function applyFeatureArgs(base: string[], items: string[] | undefined): string[] {
  if (!items?.length) return base
  const modifiers = items.filter((i) => /^[+-]/.test(i))
  if (modifiers.length && modifiers.length !== items.length) {
    throw new ProduxError(
      `--features cannot mix plain ids with +id/-id: ${items.join(",")}`,
      'Use "a,b,c" to choose the exact list, or "+a,-b" to adjust the preset.'
    )
  }
  if (!modifiers.length) return [...items]
  const set = new Set(base)
  for (const m of modifiers) {
    if (m.startsWith("+")) set.add(m.slice(1))
    else set.delete(m.slice(1))
  }
  return [...set]
}

export function resolveConfig({ cli, file, detected, userAgentPm }: ResolveInput): ProjectConfig {
  const mode = cli.mode ?? file?.mode ?? "standalone"

  const requestedPm = cli.packageManager ?? file?.packageManager
  if (mode === "existing-workspace" && detected && requestedPm && requestedPm !== detected.packageManager) {
    throw new ProduxError(
      `The existing workspace uses ${detected.packageManager}; --package-manager ${requestedPm} would mix package managers.`,
      `Drop --package-manager or use ${detected.packageManager}.`
    )
  }
  const packageManager = (mode === "existing-workspace" ? detected?.packageManager : undefined) ?? requestedPm ?? userAgentPm ?? "pnpm"

  const presetId: PresetId = cli.preset ?? file?.preset ?? "standard"
  // An explicit --preset wins over a feature list imported from a config file.
  const base = cli.preset || !file?.features ? getPreset(presetId).features : file.features
  let include = applyFeatureArgs(base, cli.features)
  const exclude = cli.features?.filter((i) => i.startsWith("-")).map((i) => i.slice(1)) ?? []

  if (cli.router) {
    include = include.filter((f) => !ROUTER_FEATURES.includes(f))
    if (cli.router !== "none") include.push(cli.router)
    else exclude.push(...ROUTER_FEATURES)
  }

  let resolved
  try {
    resolved = resolveFeatures({ include, exclude, mode, packageManager, allowUnverified: process.env.PRODUX_ALLOW_UNVERIFIED === "1" })
  } catch (e) {
    if (e instanceof ProduxError && cli.router === "none") {
      throw new ProduxError(
        e.issues.map((i) => i.replace(/Either keep "(react-router|tanstack-router)"/, "--router none removes routing;")),
        e.hint
      )
    }
    throw e
  }

  if (cli.ui && !resolved.features.includes("shadcn")) {
    throw new ProduxError("--ui requires shadcn. Add it with --features +shadcn or drop --ui.")
  }

  // The preset label stays only if nothing was customized.
  const sameAs = (p: PresetId) => {
    const target = getPreset(p).features
    return target.length === resolved.features.length && target.every((f) => resolved.features.includes(f))
  }
  const preset =
    presetId !== "custom" && sameAs(presetId) ? presetId : (PRESETS.find((p) => p.id !== "custom" && sameAs(p.id))?.id ?? "custom")

  const config: ProjectConfig = {
    mode,
    packageManager,
    preset,
    features: resolved.features,
    added: resolved.added,
    ui: { base: cli.ui ?? file?.ui?.base ?? "base", style: file?.ui?.style ?? "nova" },
    // Example pages are routes, so they need a router (docs/architecture/frontend-architecture.md).
    examples: (cli.examples ?? file?.examples ?? true) && resolved.features.some((f) => ROUTER_FEATURES.includes(f)),
  }

  if (mode !== "standalone") {
    const appName = cli.appName ?? file?.workspace?.appName ?? (mode === "existing-workspace" ? cli.dir : undefined) ?? "web"
    config.workspace = {
      appName,
      appDir: cli.appDir ?? file?.workspace?.appDir ?? `apps/${appName}`,
      turbo: mode === "existing-workspace" ? (detected?.turbo ?? false) : (cli.turbo ?? file?.workspace?.turbo ?? true),
    }
  }
  return config
}
