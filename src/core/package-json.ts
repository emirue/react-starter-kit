import versions from "../config/dependency-versions.json" with { type: "json" }
import { FEATURES } from "./features.ts"
import type { GenerateOptions, Target } from "./generate.ts"
import type { ProjectConfig } from "./resolve-config.ts"

const VERSIONS = versions as Record<string, string>

const BASE_DEPS = ["react", "react-dom"]
const BASE_DEV_DEPS = ["vite", "@vitejs/plugin-react", "typescript", "@types/react", "@types/react-dom", "@types/node"]

const SCRIPT_ORDER = [
  "dev",
  "build",
  "preview",
  "typecheck",
  "lint",
  "format",
  "format:check",
  "test",
  "test:run",
  "test:e2e",
  "api:generate",
  "prepare",
]

/** Root-level tooling in a workspace: installed and configured once at the root. */
const ROOT_TOOLING = new Set(["husky", "lint-staged"])

/** Shared workspace packages: feature id -> directory under packages/. */
export const WORKSPACE_PACKAGES: Record<string, string> = { "pkg-shared": "shared", "pkg-types": "types", "pkg-ui": "ui" }

const selectedPackages = (config: ProjectConfig) => Object.keys(WORKSPACE_PACKAGES).filter((id) => config.features.includes(id))

function pinned(names: Iterable<string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const name of [...new Set(names)].sort()) {
    const v = VERSIONS[name]
    if (!v) throw new Error(`dependency-versions.json has no version for ${name}`)
    out[name] = v
  }
  return out
}

function sortScripts(scripts: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(scripts).sort(([a], [b]) => (SCRIPT_ORDER.indexOf(a) + 1 || 99) - (SCRIPT_ORDER.indexOf(b) + 1 || 99))
  )
}

const packageManagerField = (config: ProjectConfig, opts: GenerateOptions) =>
  opts.packageManagerVersion ? `${config.packageManager}@${opts.packageManagerVersion}` : undefined

export function appPackageJson(config: ProjectConfig, target: Target, opts: GenerateOptions): string {
  const inWorkspace = config.mode !== "standalone"
  const deps = [...BASE_DEPS]
  const devDeps = [...BASE_DEV_DEPS]
  let scripts: Record<string, string> = {
    dev: "vite",
    build: "tsc -b && vite build",
    preview: "vite preview",
    typecheck: "tsc -b",
  }
  for (const feature of FEATURES.filter((f) => config.features.includes(f.id))) {
    if (inWorkspace && ROOT_TOOLING.has(feature.id)) continue
    deps.push(...(feature.dependencies ?? []))
    devDeps.push(...(feature.devDependencies ?? []))
    scripts = { ...scripts, ...feature.scripts }
  }
  if (config.features.includes("shadcn")) deps.push(config.ui.base === "base" ? "@base-ui/react" : "radix-ui")

  const workspaceDeps = Object.fromEntries(
    selectedPackages(config).map((id) => [`@${target.projectName}/${WORKSPACE_PACKAGES[id]}`, "workspace:*"])
  )
  const pkg = {
    name: target.appName,
    private: true,
    version: "0.0.0",
    type: "module",
    packageManager: inWorkspace ? undefined : packageManagerField(config, opts),
    scripts: sortScripts(scripts),
    dependencies: { ...pinned(deps), ...workspaceDeps },
    devDependencies: pinned(devDeps),
  }
  return `${JSON.stringify(pkg, null, 2)}\n`
}

export function workspacePackageJson(target: Target, id: string): string {
  const ui = id === "pkg-ui"
  const pkg = {
    name: `@${target.projectName}/${WORKSPACE_PACKAGES[id]}`,
    version: "0.0.0",
    private: true,
    type: "module",
    exports: { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } },
    files: ["dist"],
    scripts: { build: "tsc -b", dev: "tsc -b --watch --preserveWatchOutput", typecheck: "tsc -b" },
    peerDependencies: ui ? { react: "^19.0.0", "react-dom": "^19.0.0" } : undefined,
    devDependencies: pinned(ui ? ["typescript", "react", "react-dom", "@types/react", "@types/react-dom"] : ["typescript"]),
  }
  return `${JSON.stringify(pkg, null, 2)}\n`
}

export function rootPackageJson(config: ProjectConfig, target: Target, opts: GenerateOptions): string {
  const turbo = config.workspace?.turbo
  // Without Turborepo, pnpm -r runs packages in dependency order; tasks that do
  // not build (dev, test) build the shared packages first.
  const buildPackages = selectedPackages(config).length ? `pnpm -r --filter "./packages/**" run build && ` : ""
  const scripts: Record<string, string> = turbo
    ? {
        dev: "turbo run dev",
        build: "turbo run build",
        typecheck: "turbo run typecheck",
        lint: "turbo run lint",
        // CI-safe single run; watch mode stays per app.
        test: "turbo run test:run",
      }
    : {
        dev: `${buildPackages}pnpm -r --parallel --if-present run dev`,
        build: "pnpm -r --if-present run build",
        typecheck: "pnpm -r --if-present run typecheck",
        lint: "pnpm -r --if-present run lint",
        test: `${buildPackages}pnpm -r --if-present run test:run`,
      }
  const devDeps: string[] = []
  if (turbo) devDeps.push("turbo")
  if (config.features.includes("husky")) {
    devDeps.push("husky")
    scripts.prepare = "husky"
  }
  if (config.features.includes("lint-staged")) devDeps.push("lint-staged")
  const pkg = {
    name: target.projectName,
    private: true,
    packageManager: packageManagerField(config, opts),
    scripts: sortScripts(scripts),
    devDependencies: devDeps.length ? pinned(devDeps) : undefined,
  }
  return `${JSON.stringify(pkg, null, 2)}\n`
}

/** pnpm settings. Build scripts must be approved explicitly since pnpm 11. */
export function pnpmWorkspaceYaml(config: ProjectConfig): string | undefined {
  if (config.packageManager !== "pnpm") return undefined
  const lines: string[] = []
  if (config.mode === "monorepo") lines.push("packages:", "  - 'apps/*'", "  - 'packages/*'", "")
  // orval bundles esbuild; its postinstall only verifies the platform binary.
  if (config.features.includes("orval")) lines.push("allowBuilds:", "  esbuild: true", "")
  return lines.length ? `${lines.join("\n").trimEnd()}\n` : undefined
}
