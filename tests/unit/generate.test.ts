import { describe, expect, it, vi } from "vitest"

import type { CliOptions } from "../../src/cli/options.ts"
import versions from "../../src/config/dependency-versions.json" with { type: "json" }
import { FEATURES } from "../../src/core/features.ts"
import { createPlan, type Target } from "../../src/core/generate.ts"
import { resolveConfig } from "../../src/core/resolve-config.ts"

const cli = (o: Partial<CliOptions> = {}): CliOptions => ({
  yes: true,
  install: true,
  git: true,
  verify: true,
  dryRun: false,
  allowWorkspaceChanges: false,
  ...o,
})
const standalone: Target = { rootDir: "/tmp/my-app", appDir: "/tmp/my-app", projectName: "my-app", appName: "my-app" }

async function plan(o: Partial<CliOptions>, target = standalone) {
  const config = resolveConfig({ cli: cli(o) })
  return createPlan(config, target, { packageManagerVersion: "11.13.0" })
}
const file = (p: Awaited<ReturnType<typeof plan>>, path: string) => p.files.find((f) => f.path === path)?.content
const pkgJson = (p: Awaited<ReturnType<typeof plan>>, path = "package.json") => JSON.parse(file(p, path)!)

describe("createPlan", () => {
  it("falls back to pnpm 11.29.0 in the Dockerfile when the local pnpm version is unknown", async () => {
    // 11.13.0 is deprecated on npm as broken; 11.29.0 ran the Linux, macOS and Windows CI scenarios.
    const p = await createPlan(resolveConfig({ cli: cli({ features: ["+docker"] }) }), standalone, {})
    expect(file(p, "Dockerfile")).toContain("npm install -g pnpm@11.29.0")
    expect(versions.pnpm).toBe("11.29.0")
  })

  it("generates a minimal standalone project with pinned versions", async () => {
    const p = await plan({ preset: "minimal" })
    const pkg = pkgJson(p)
    expect(pkg.name).toBe("my-app")
    expect(pkg.packageManager).toBe("pnpm@11.13.0")
    expect(pkg.dependencies).toEqual({ react: versions.react, "react-dom": versions["react-dom"] })
    expect(pkg.devDependencies.eslint).toBe(versions.eslint)
    expect(pkg.scripts).toMatchObject({ dev: "vite", build: "tsc -b && vite build", typecheck: "tsc -b", lint: "eslint ." })
    const paths = p.files.map((f) => f.path)
    expect(paths).toEqual(expect.arrayContaining([".gitignore", "index.html", "src/main.tsx", "vite.config.ts", "eslint.config.js"]))
    expect(paths.every((x) => !x.includes("dot_"))).toBe(true)
  })

  it("never references a package that the selected features do not install", async () => {
    // For each optional package, generate without the feature that owns it and grep every file.
    for (const feature of FEATURES) {
      const packages = [...(feature.dependencies ?? []), ...(feature.devDependencies ?? [])]
      if (!packages.length) continue
      const p = await plan({ preset: "standard", features: [`-${feature.id}`] }).catch(() => undefined)
      if (!p) continue // the preset needs this feature; covered by resolver tests
      const pkg = pkgJson(p)
      const installed = { ...pkg.dependencies, ...pkg.devDependencies }
      for (const name of packages) {
        if (name in installed) continue // also installed by another selected feature
        for (const f of p.files) {
          const importsIt = new RegExp(
            `from ["']${name.replace(/[/.]/g, "\\$&")}(/[^"']*)?["']|import\\(["']${name.replace(/[/.]/g, "\\$&")}`
          )
          expect(importsIt.test(f.content), `${f.path} imports ${name} without feature ${feature.id}`).toBe(false)
        }
      }
    }
  })

  it("is deterministic for the same configuration", async () => {
    const a = await plan({ preset: "standard" })
    const b = await plan({ preset: "standard" })
    expect(a.files).toEqual(b.files)
  })

  it("renders no leftover template directives or variables", async () => {
    for (const preset of ["minimal", "standard"] as const) {
      for (const examples of [true, false]) {
        const p = await plan({ preset, examples })
        for (const f of p.files) {
          expect(f.content, f.path).not.toMatch(/@(if|else|endif)\b|\{\{\s*\w+\s*\}\}/)
        }
      }
    }
  })
})

describe("createPlan: static assets", () => {
  it("copies files under public/ byte for byte", async () => {
    const { readFile } = await import("node:fs/promises")
    vi.stubEnv("PRODUX_ALLOW_UNVERIFIED", "1")
    const p = await plan({ preset: "standard", features: ["+msw"] })
    vi.unstubAllEnvs()
    const worker = p.files.find((f) => f.path === "public/mockServiceWorker.js")!.content
    const source = await readFile(new URL("../../templates/features/msw/app/public/mockServiceWorker.js", import.meta.url), "utf8")
    expect(worker).toBe(source)
  })
})
