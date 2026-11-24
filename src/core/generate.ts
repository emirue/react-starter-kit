import { existsSync } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import { dirname, join, posix, relative, sep } from "node:path"

import { PM } from "../adapters/package-manager.ts"
import versions from "../config/dependency-versions.json" with { type: "json" }
import { ProduxError } from "../utils/errors.ts"
import { FEATURES } from "./features.ts"
import { contextFlags } from "./flags.ts"
import { appPackageJson, pnpmWorkspaceYaml, rootPackageJson, WORKSPACE_PACKAGES, workspacePackageJson } from "./package-json.ts"
import type { ProjectConfig } from "./resolve-config.ts"
import { renderTemplate, type TemplateContext } from "./template.ts"

export interface Target {
  /** Standalone: project dir. New monorepo: project dir. Existing workspace: workspace root. */
  rootDir: string
  appDir: string
  /** Root package name (standalone: same as appName). */
  projectName: string
  appName: string
}

export interface PlannedFile {
  /** Relative to Target.rootDir, POSIX separators. */
  path: string
  content: string
}

export interface Plan {
  files: PlannedFile[]
  /** Template files not written in this mode, with the reason. */
  skipped: { path: string; reason: string }[]
}

export interface GenerateOptions {
  /** Version of the package manager, written to "packageManager". */
  packageManagerVersion?: string
}

export const NODE_REQUIREMENT = "^22.22.2 || ^24.15.0 || >=26.0.0"

/** Finds templates/ both from src/core (tests) and from dist (published package). */
function templatesDir(): string {
  for (let dir = import.meta.dirname; ; dir = dirname(dir)) {
    if (existsSync(join(dir, "templates", "base"))) return join(dir, "templates")
    if (dirname(dir) === dir) throw new Error("create-produx-app: templates directory not found")
  }
}

async function walk(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return []
  const entries = await readdir(dir, { recursive: true, withFileTypes: true })
  return entries
    .filter((e) => e.isFile())
    .map((e) => relative(dir, join(e.parentPath, e.name)).split(sep).join("/"))
    .sort()
}

/** "dot_gitignore" -> ".gitignore": npm drops some dotfiles from published packages. */
const outputName = (p: string) =>
  p
    .split("/")
    .map((s) => s.replace(/^dot_/, "."))
    .join("/")

/** Lines of `{ name, version }` objects for the welcome page. */
function stackItems(config: ProjectConfig): string {
  const v = versions as Record<string, string>
  const items: [string, string | undefined][] = [
    ["React", v.react],
    ["Vite", v.vite],
    ["TypeScript", v.typescript],
  ]
  for (const f of FEATURES.filter((x) => config.features.includes(x.id) && x.group !== "ai" && x.group !== "workspace")) {
    const primary = [...(f.dependencies ?? []), ...(f.devDependencies ?? [])][0]
    const name = f.id === "shadcn" ? `shadcn/ui (${config.ui.base === "base" ? "Base UI" : "Radix UI"})` : f.name
    items.push([name, primary ? v[primary] : undefined])
  }
  return items
    .map(([name, version]) => `  { name: ${JSON.stringify(name)}${version ? `, version: ${JSON.stringify(version)}` : ""} },`)
    .join("\n")
}

export async function createPlan(config: ProjectConfig, target: Target, opts: GenerateOptions = {}): Promise<Plan> {
  const pm = PM[config.packageManager]
  const appRel = relative(target.rootDir, target.appDir).split(sep).join("/") || "."
  const ctx: TemplateContext & { vars: Record<string, string> } = {
    flags: contextFlags(config),
    vars: {
      appName: target.appName,
      projectName: target.projectName,
      appDir: appRel,
      pm: config.packageManager,
      pmRun: pm.run,
      pmDlx: pm.dlx,
      pmExec: pm.exec,
      pmInstall: pm.install.join(" "),
      pmFilterDev: pm.filterRun(target.appName, "dev"),
      pmFilterBuild: pm.filterRun(target.appName, "build"),
      nodeRequirement: NODE_REQUIREMENT,
      uiStyle: `${config.ui.base}-${config.ui.style}`,
      stackItems: stackItems(config),
      // The version this release was verified with, when the local one is unknown.
      pmVersion: opts.packageManagerVersion ?? (versions as Record<string, string>).pnpm!,
    },
  }

  const root = templatesDir()
  ctx.vars.stackMarkdown = stackItems(config)
    .split("\n")
    .map((line) => {
      const m = /name: "([^"]+)"(?:, version: "([^"]+)")?/.exec(line)
      return m ? `- ${m[1]}${m[2] ? ` ${m[2]}` : ""}` : ""
    })
    .join("\n")
  ctx.vars.aiRules = renderTemplate(await readFile(join(root, "shared", "ai-rules.md"), "utf8"), ctx).trim()
  const layers = ["base", ...config.features.map((f) => `features/${f}`)]
  const files = new Map<string, { content: string; from: string }>()
  const skipped: Plan["skipped"] = []

  const add = (path: string, content: string, from: string) => {
    if (posix.normalize(path).startsWith("..")) throw new Error(`Template path escapes the project: ${path}`)
    const existing = files.get(path)
    if (existing) throw new ProduxError(`Template conflict: ${path} is produced by both ${existing.from} and ${from}.`)
    files.set(path, { content, from })
  }

  for (const layer of layers) {
    const base: [string, string | undefined][] = [
      ["app", appRel],
      ["root", config.mode === "existing-workspace" ? appRel : "."],
      ["monorepo", config.mode === "monorepo" ? "." : undefined],
    ]
    if (config.examples) base.push(["examples/app", appRel])
    // "when-<flag>/" holds files that exist only when <flag> is set (e.g. when-ui-radix/).
    const variants = existsSync(join(root, layer))
      ? (await readdir(join(root, layer))).filter((d) => d.startsWith("when-") && ctx.flags.has(d.slice(5)))
      : []
    const sources = [...base, ...variants.flatMap((v) => base.map(([sub, dest]) => [`${v}/${sub}`, dest] as [string, string | undefined]))]
    for (const [sub, dest] of sources) {
      if (dest === undefined) continue
      for (const rel of await walk(join(root, layer, sub))) {
        const out = outputName(rel)
        if (config.mode === "existing-workspace" && sub.endsWith("root") && /^\.(github|husky)\//.test(out)) {
          skipped.push({ path: out, reason: "existing workspaces keep their own CI and git hooks" })
          continue
        }
        const content = renderTemplate(await readFile(join(root, layer, sub, rel), "utf8"), ctx)
        if (!content.trim()) continue
        add(posix.join(dest, out), content.endsWith("\n") ? content : `${content}\n`, `${layer}/${sub}`)
      }
    }
  }

  add(posix.join(appRel, "package.json"), appPackageJson(config, target, opts), "package.json")
  if (config.mode === "monorepo") {
    add("package.json", rootPackageJson(config, target, opts), "package.json")
    for (const id of config.features.filter((f) => f in WORKSPACE_PACKAGES)) {
      add(`packages/${WORKSPACE_PACKAGES[id]}/package.json`, workspacePackageJson(target, id), "package.json")
    }
  }
  const workspaceYaml = config.mode === "existing-workspace" ? undefined : pnpmWorkspaceYaml(config)
  if (workspaceYaml) add("pnpm-workspace.yaml", workspaceYaml, "pnpm-workspace.yaml")

  return {
    files: [...files].map(([path, f]) => ({ path, content: f.content })).sort((a, b) => a.path.localeCompare(b.path)),
    skipped,
  }
}
