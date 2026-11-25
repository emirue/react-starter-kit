import { existsSync } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import { dirname, join, relative, sep } from "node:path"

import { LOCKFILES, type PackageManager } from "../adapters/package-manager.ts"
import { ProduxError } from "../utils/errors.ts"

export interface WorkspaceInfo {
  root: string
  packageManager: PackageManager
  packageManagerVersion: string | undefined
  globs: string[]
  configFile: "pnpm-workspace.yaml" | "package.json"
  lockfiles: string[]
  turbo: boolean
  gitRoot: string | undefined
  packages: { name: string; dir: string }[]
  /** Root lifecycle scripts that run on install (preinstall, install, postinstall, prepare). */
  lifecycleScripts: string[]
  /** Package names pinned by overrides/resolutions: they replace the versions this CLI verified. */
  overrides: string[]
  hasCatalog: boolean
  hasPnpmfile: boolean
}

// Root scripts pnpm runs on install. Workspace packages' own install scripts
// and .pnpmfile.cjs run too; see run.ts, which treats any install as running workspace code.
const LIFECYCLE = ["pnpm:devPreinstall", "preinstall", "install", "postinstall", "preprepare", "prepare", "postprepare"]

/** Keys of a top-level block in pnpm-workspace.yaml, e.g. `overrides:`. */
function yamlBlockKeys(yaml: string, block: string): string[] {
  const lines = yaml.split(/\r?\n/)
  const start = lines.findIndex((l) => new RegExp(`^${block}:\\s*$`).test(l))
  if (start === -1) return []
  const keys: string[] = []
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break
    const m = /^\s+(['"]?)([^'":\s][^'":]*)\1\s*:/.exec(line)
    if (m) keys.push(m[2]!)
  }
  return keys
}

async function readJson(path: string): Promise<Record<string, unknown> | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>
  } catch {
    return undefined
  }
}

/** Reads the block-style `packages:` list of pnpm-workspace.yaml. */
export function parsePnpmPackages(yaml: string): string[] {
  const lines = yaml.split(/\r?\n/)
  const start = lines.findIndex((l) => /^packages:\s*$/.test(l))
  if (start === -1) return []
  const globs: string[] = []
  for (const line of lines.slice(start + 1)) {
    // YAML allows list items at column 0 ("- apps/*") as well as indented.
    const m = /^\s*-\s*(['"]?)(.+?)\1\s*(#.*)?$/.exec(line)
    if (m) globs.push(m[2]!)
    else if (/^[^\s#]/.test(line)) break
  }
  return globs
}

/** Adds a glob to the block-style `packages:` list. Refuses layouts it cannot edit safely. */
export function addWorkspaceGlob(yaml: string, glob: string): string {
  const lines = yaml.split("\n")
  const start = lines.findIndex((l) => /^packages:/.test(l))
  if (start === -1) return `packages:\n  - '${glob}'\n${yaml}`
  if (!/^packages:\s*$/.test(lines[start]!)) {
    throw new ProduxError(
      "pnpm-workspace.yaml uses a flow-style packages list that create-produx-app does not rewrite.",
      `Add '${glob}' to "packages" yourself, then run the command again.`
    )
  }
  let last = start
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*-/.test(lines[i]!)) last = i
    else if (/^[^\s#]/.test(lines[i]!)) break
  }
  const indent = last === start ? "  " : (/^(\s*)-/.exec(lines[last]!)?.[1] ?? "")
  lines.splice(last + 1, 0, `${indent}- '${glob}'`)
  return lines.join("\n")
}

/**
 * Approves a dependency build script in pnpm-workspace.yaml. Returns the new
 * content, or undefined when the workspace already decided (true or false).
 */
export function ensureAllowBuild(yaml: string, pkg: string): string | undefined {
  if (/^allowBuilds:[ \t]*[^\s#]/m.test(yaml)) {
    throw new ProduxError(
      "pnpm-workspace.yaml uses a flow-style allowBuilds map that create-produx-app does not rewrite.",
      `Add "${pkg}: true" to allowBuilds yourself, then run the command again.`
    )
  }
  if (yamlBlockKeys(yaml, "allowBuilds").includes(pkg)) return undefined
  const lines = yaml.split("\n")
  const start = lines.findIndex((l) => /^allowBuilds:\s*$/.test(l))
  if (start === -1) return `${yaml.trimEnd()}\n\nallowBuilds:\n  ${pkg}: true\n`
  let last = start
  for (let i = start + 1; i < lines.length && !/^\S/.test(lines[i]!); i++) if (lines[i]!.trim()) last = i
  lines.splice(last + 1, 0, `  ${pkg}: true`)
  return lines.join("\n")
}

export function globMatches(glob: string, dir: string): boolean {
  const re = glob
    .replace(/\/+$/, "")
    .split("/")
    .map((seg) => (seg === "**" ? ".*" : seg.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*")))
    .join("/")
  return new RegExp(`^${re}$`).test(dir)
}

/** The negated pattern ("!apps/old") that keeps `dir` out of the workspace, if any: it wins over the positive globs. */
export function excludingGlob(globs: string[], dir: string): string | undefined {
  return globs.find((g) => g.startsWith("!") && globMatches(g.slice(1), dir))
}

async function listPackages(root: string, globs: string[]): Promise<WorkspaceInfo["packages"]> {
  const found: WorkspaceInfo["packages"] = []
  for (const glob of globs.filter((g) => !g.startsWith("!"))) {
    // Only "dir", "dir/*" and "dir/**" (one level) are expanded; that covers common layouts.
    const base = glob.replace(/\/\*\*?$/, "")
    const dirs =
      glob === base
        ? [base]
        : await readdir(join(root, base)).then(
            (e) => e.map((n) => join(base, n)),
            () => []
          )
    for (const dir of dirs) {
      if (excludingGlob(globs, dir.split(sep).join("/"))) continue
      const pkg = await readJson(join(root, dir, "package.json"))
      if (typeof pkg?.name === "string") found.push({ name: pkg.name, dir })
    }
  }
  return found
}

function findUp(start: string, test: (dir: string) => boolean): string | undefined {
  for (let dir = start; ; dir = dirname(dir)) {
    if (test(dir)) return dir
    if (dirname(dir) === dir) return undefined
  }
}

export async function detectWorkspace(start: string): Promise<WorkspaceInfo | undefined> {
  let root: string | undefined
  let globs: string[]
  let configFile: WorkspaceInfo["configFile"] = "package.json"
  let yaml = ""
  for (let dir = start; ; dir = dirname(dir)) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
      root = dir
      configFile = "pnpm-workspace.yaml"
      yaml = await readFile(join(dir, "pnpm-workspace.yaml"), "utf8")
      globs = parsePnpmPackages(yaml)
      break
    }
    const pkg = await readJson(join(dir, "package.json"))
    const ws = pkg?.workspaces
    const list = Array.isArray(ws) ? ws : (ws as { packages?: unknown } | undefined)?.packages
    if (Array.isArray(list)) {
      root = dir
      globs = list.filter((g): g is string => typeof g === "string")
      break
    }
    if (dirname(dir) === dir) return undefined
  }

  const rootPkg = await readJson(join(root, "package.json"))
  const lockfiles = Object.keys(LOCKFILES).filter((f) => existsSync(join(root, f)))
  const fromLockfiles = [...new Set(lockfiles.map((f) => LOCKFILES[f]!))]
  const declared = /^(pnpm|npm|yarn|bun)@(\S+)$/.exec(String(rootPkg?.packageManager ?? ""))
  if (!declared && fromLockfiles.length > 1) {
    throw new ProduxError(
      `The workspace at ${root} has lockfiles for several package managers: ${lockfiles.join(", ")}.`,
      'Set "packageManager" in the root package.json or remove the stale lockfile, then try again.'
    )
  }
  const packageManager =
    (declared?.[1] as PackageManager | undefined) ?? fromLockfiles[0] ?? (configFile === "pnpm-workspace.yaml" ? "pnpm" : "npm")

  return {
    root,
    packageManager,
    packageManagerVersion: declared?.[2]?.split("+")[0],
    globs,
    configFile,
    lockfiles,
    turbo: existsSync(join(root, "turbo.json")) || existsSync(join(root, "turbo.jsonc")),
    gitRoot: findUp(root, (d) => existsSync(join(d, ".git"))),
    packages: await listPackages(root, globs),
    lifecycleScripts: LIFECYCLE.filter((name) => typeof (rootPkg?.scripts as Record<string, unknown> | undefined)?.[name] === "string"),
    overrides: [
      ...new Set([
        ...Object.keys((rootPkg?.pnpm as { overrides?: object } | undefined)?.overrides ?? {}),
        ...Object.keys((rootPkg?.overrides as object | undefined) ?? {}),
        ...Object.keys((rootPkg?.resolutions as object | undefined) ?? {}),
        ...yamlBlockKeys(yaml, "overrides"),
      ]),
    ],
    hasCatalog: /^catalogs?:/m.test(yaml),
    hasPnpmfile: existsSync(join(root, ".pnpmfile.cjs")) || existsSync(join(root, ".pnpmfile.mjs")),
  }
}

export function isInside(parent: string, child: string): boolean {
  const rel = relative(parent, child)
  return rel === "" || (!rel.startsWith("..") && !/^([a-zA-Z]:|[\\/])/.test(rel))
}
