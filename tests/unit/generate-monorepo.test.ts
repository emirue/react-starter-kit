import { describe, expect, it } from "vitest"

import type { CliOptions } from "../../src/cli/options.ts"
import versions from "../../src/config/dependency-versions.json" with { type: "json" }
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
const target: Target = { rootDir: "/tmp/acme", appDir: "/tmp/acme/apps/web", projectName: "acme", appName: "web" }

async function plan(o: Partial<CliOptions>) {
  return createPlan(resolveConfig({ cli: cli({ mode: "monorepo", ...o }) }), target, { packageManagerVersion: "11.13.0" })
}
const json = (p: Awaited<ReturnType<typeof plan>>, path: string) => JSON.parse(p.files.find((f) => f.path === path)!.content)
const paths = (p: Awaited<ReturnType<typeof plan>>) => p.files.map((f) => f.path)

describe("createPlan (new monorepo)", () => {
  it("puts the app under apps/web and workspace files at the root", async () => {
    const p = await plan({})
    expect(paths(p)).toEqual(
      expect.arrayContaining([
        "package.json",
        "pnpm-workspace.yaml",
        "turbo.json",
        ".gitignore",
        "README.md",
        "apps/web/package.json",
        "apps/web/src/main.tsx",
      ])
    )
    expect(paths(p)).not.toContain("apps/web/.gitignore")
    expect(paths(p).filter((x) => x.endsWith("pnpm-lock.yaml"))).toEqual([])
  })

  it("declares the package manager and tools only at the root", async () => {
    const p = await plan({ features: ["+husky", "+lint-staged"] })
    const root = json(p, "package.json")
    const app = json(p, "apps/web/package.json")
    expect(root.packageManager).toBe("pnpm@11.13.0")
    expect(root.devDependencies).toEqual({ turbo: versions.turbo, husky: versions.husky, "lint-staged": versions["lint-staged"] })
    expect(root.scripts).toMatchObject({ build: "turbo run build", test: "turbo run test:run", prepare: "husky" })
    expect(app.packageManager).toBeUndefined()
    expect(app.devDependencies.husky).toBeUndefined()
    expect(app.scripts.prepare).toBeUndefined()
  })

  it("uses pnpm -r scripts without Turborepo", async () => {
    const p = await plan({ turbo: false })
    expect(paths(p)).not.toContain("turbo.json")
    const root = json(p, "package.json")
    expect(root.devDependencies).toBeUndefined()
    expect(root.scripts.build).toBe("pnpm -r --if-present run build")
  })

  it("creates selected shared packages and links them with workspace:*", async () => {
    const p = await plan({ features: ["+pkg-shared", "+pkg-types", "+pkg-ui"] })
    for (const name of ["shared", "types", "ui"]) {
      const pkg = json(p, `packages/${name}/package.json`)
      expect(pkg.name).toBe(`@acme/${name}`)
      expect(pkg.exports["."]).toEqual({ types: "./dist/index.d.ts", default: "./dist/index.js" })
      expect(pkg.scripts.build).toBe("tsc -b")
    }
    expect(json(p, "packages/ui/package.json").peerDependencies).toEqual({ react: expect.any(String), "react-dom": expect.any(String) })
    const app = json(p, "apps/web/package.json")
    expect(app.dependencies).toMatchObject({ "@acme/shared": "workspace:*", "@acme/types": "workspace:*", "@acme/ui": "workspace:*" })
    expect(p.files.find((f) => f.path === "apps/web/src/index.css")!.content).toContain('@source "../../../packages/ui/src";')
  })

  it("creates no shared packages unless selected", async () => {
    const p = await plan({})
    expect(paths(p).some((x) => x.startsWith("packages/"))).toBe(false)
  })
})

describe("createPlan (existing workspace)", () => {
  it("writes only inside the app directory", async () => {
    const config = resolveConfig({
      cli: cli({ mode: "existing-workspace", dir: "admin", features: ["+github-actions", "+husky"] }),
      detected: { packageManager: "pnpm", turbo: true },
    })
    const p = await createPlan(config, { rootDir: "/ws", appDir: "/ws/apps/admin", projectName: "ws", appName: "admin" })
    expect(paths(p).every((x) => x.startsWith("apps/admin/"))).toBe(true)
    expect(paths(p)).toContain("apps/admin/.gitignore")
    expect(p.skipped.map((s) => s.path)).toEqual(expect.arrayContaining([".github/workflows/ci.yml"]))
  })
})
