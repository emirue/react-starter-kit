import { afterEach, describe, expect, it, vi } from "vitest"

import type { CliOptions } from "../../src/cli/options.ts"
import { parseConfigFile } from "../../src/core/config-schema.ts"
import { getPreset } from "../../src/core/presets.ts"
import { resolveConfig, withConfigFileAnswers } from "../../src/core/resolve-config.ts"

afterEach(() => vi.unstubAllEnvs())

const cli = (o: Partial<CliOptions> = {}): CliOptions => ({
  yes: true,
  install: true,
  git: true,
  verify: true,
  dryRun: false,
  allowWorkspaceChanges: false,
  ...o,
})

describe("resolveConfig", () => {
  it("uses global defaults: standalone, pnpm, standard, Base UI, nova, examples", () => {
    const c = resolveConfig({ cli: cli() })
    expect(c).toMatchObject({
      mode: "standalone",
      packageManager: "pnpm",
      preset: "standard",
      ui: { base: "base", style: "nova" },
      examples: true,
    })
    expect(c.features).toEqual(resolveConfig({ cli: cli({ preset: "standard" }) }).features)
  })

  it("prefers the package manager that launched the CLI over the default", () => {
    expect(resolveConfig({ cli: cli(), userAgentPm: "npm" }).packageManager).toBe("npm")
  })

  it("applies precedence: CLI > config file > preset > defaults", () => {
    const file = parseConfigFile({ schemaVersion: 1, preset: "minimal", packageManager: "npm", ui: { base: "radix" } })
    const c = resolveConfig({ cli: cli({ packageManager: "pnpm" }), file })
    expect(c.packageManager).toBe("pnpm")
    expect(c.preset).toBe("minimal")
    expect(c.features).toEqual(["eslint"])
    expect(resolveConfig({ cli: cli({ preset: "standard" }), file }).ui.base).toBe("radix")
  })

  it("adjusts preset features with +id / -id and marks the preset custom", () => {
    const c = resolveConfig({ cli: cli({ features: ["+tanstack-table", "-zustand"] }) })
    expect(c.features).toContain("tanstack-table")
    expect(c.features).not.toContain("zustand")
    expect(c.preset).toBe("custom")
  })

  it("replaces the feature list with plain ids", () => {
    const c = resolveConfig({ cli: cli({ features: ["tailwind"] }) })
    expect(c.features).toEqual(["tailwind"])
  })

  it("rejects mixing plain and +/- feature items", () => {
    expect(() => resolveConfig({ cli: cli({ features: ["tailwind", "+zustand"] }) })).toThrow(/mix/)
  })

  it("maps --router onto the router features", () => {
    const tsr = resolveConfig({ cli: cli({ router: "tanstack-router" }) }).features
    expect(tsr).toContain("tanstack-router")
    expect(tsr).not.toContain("react-router")
    expect(resolveConfig({ cli: cli({ router: "none" }) }).features).not.toContain("react-router")
  })

  it("rejects --ui without shadcn", () => {
    expect(() => resolveConfig({ cli: cli({ preset: "minimal", ui: "radix" }) })).toThrow(/--ui requires shadcn/)
  })

  it("rejects --router none when a feature needs a router", () => {
    vi.stubEnv("PRODUX_ALLOW_UNVERIFIED", "1")
    expect(() => resolveConfig({ cli: cli({ preset: "admin", router: "none" }) })).toThrow(/admin-layout" requires/)
  })

  it("resolves the enterprise preset", () => {
    expect(resolveConfig({ cli: cli({ preset: "enterprise" }) }).features).toEqual(
      expect.arrayContaining(["orval", "msw", "playwright", "docker", "codeql"])
    )
  })

  it("fills workspace defaults for a new monorepo (Turborepo on)", () => {
    const c = resolveConfig({ cli: cli({ mode: "monorepo" }) })
    expect(c.workspace).toEqual({ appName: "web", appDir: "apps/web", turbo: true })
  })

  it("keeps the detected package manager of an existing workspace", () => {
    const detected = { packageManager: "pnpm" as const, turbo: true }
    const c = resolveConfig({ cli: cli({ mode: "existing-workspace", dir: "admin" }), detected })
    expect(c.packageManager).toBe("pnpm")
    expect(c.workspace).toEqual({ appName: "admin", appDir: "apps/admin", turbo: true })
    expect(() => resolveConfig({ cli: cli({ mode: "existing-workspace", packageManager: "npm" }), detected })).toThrow(/uses pnpm/)
  })

  it("keeps the preset id when the result equals the preset", () => {
    const c = resolveConfig({ cli: cli({ preset: "minimal" }) })
    expect(c.preset).toBe("minimal")
    expect(resolveConfig({ cli: cli({ features: getPreset("standard").features }) }).preset).toBe("standard")
  })
})

describe("review findings after 0.1.0", () => {
  const detected = { packageManager: "pnpm" as const, turbo: false }

  it("existing workspace: the app name on the command line wins over the config file", () => {
    const file = parseConfigFile({ schemaVersion: 1, mode: "existing-workspace", workspace: { appName: "first", appDir: "apps/first" } })
    const c = resolveConfig({ cli: cli({ mode: "existing-workspace", dir: "second" }), file, detected })
    expect(c.workspace).toMatchObject({ appName: "second", appDir: "apps/second" })
  })

  it("keeps the config file's parent directory for the new app", () => {
    const file = parseConfigFile({ schemaVersion: 1, mode: "existing-workspace", workspace: { appName: "first", appDir: "tools/first" } })
    expect(resolveConfig({ cli: cli({ mode: "existing-workspace", dir: "second" }), file, detected }).workspace!.appDir).toBe(
      "tools/second"
    )
  })

  it("derives the app directory from the unscoped name, so a saved config loads again", () => {
    const c = resolveConfig({ cli: cli({ mode: "monorepo", appName: "@acme/web" }) })
    expect(c.workspace!.appDir).toBe("apps/web")
    expect(() => parseConfigFile({ schemaVersion: 1, mode: "monorepo", workspace: c.workspace })).not.toThrow()
  })

  it("a new monorepo uses pnpm when npm only launched the CLI (npm create)", () => {
    expect(resolveConfig({ cli: cli({ mode: "monorepo" }), userAgentPm: "npm" }).packageManager).toBe("pnpm")
    // An explicit request is kept, and refused later as before.
    expect(resolveConfig({ cli: cli({ mode: "monorepo", packageManager: "npm" }) }).packageManager).toBe("npm")
  })

  it("interactive mode takes the config file's answers instead of asking again", () => {
    const file = parseConfigFile({
      schemaVersion: 1,
      mode: "monorepo",
      packageManager: "pnpm",
      ui: { base: "radix" },
      workspace: { turbo: false },
      examples: false,
    })
    expect(withConfigFileAnswers(cli({}), file)).toMatchObject({
      mode: "monorepo",
      packageManager: "pnpm",
      turbo: false,
      ui: "radix",
      examples: false,
    })
    expect(withConfigFileAnswers(cli({ mode: "standalone" }), file).mode).toBe("standalone")
    expect(withConfigFileAnswers(cli({}), undefined)).toEqual(cli({}))
  })
})
