import { describe, expect, it } from "vitest"

import { parseCliArgs } from "../../src/cli/options.ts"
import { appDirValidator } from "../../src/cli/prompts.ts"
import { ProduxError } from "../../src/utils/errors.ts"

const parse = (...argv: string[]) => parseCliArgs(argv, { silent: true })

describe("parseCliArgs", () => {
  it("parses the documented non-interactive example", () => {
    const r = parse("my-app", "--mode", "standalone", "--preset", "standard", "--package-manager", "pnpm", "--yes")
    expect(r.kind).toBe("run")
    if (r.kind !== "run") return
    expect(r.options).toMatchObject({
      dir: "my-app",
      mode: "standalone",
      preset: "standard",
      packageManager: "pnpm",
      yes: true,
      install: true,
      git: true,
      verify: true,
      dryRun: false,
    })
    expect(r.options.turbo).toBeUndefined()
    expect(r.options.examples).toBeUndefined()
  })

  it("parses negated flags and lists", () => {
    const r = parse("web", "--no-install", "--no-git", "--no-verify", "--no-examples", "--no-turbo", "--features", "+playwright, -zustand")
    if (r.kind !== "run") throw new Error(r.kind)
    expect(r.options).toMatchObject({ install: false, git: false, verify: false, examples: false, turbo: false })
    expect(r.options.features).toEqual(["+playwright", "-zustand"])
  })

  it("accepts --save-config with and without a path", () => {
    const a = parse("x", "--save-config")
    const b = parse("x", "--save-config", "presets/team.json")
    if (a.kind !== "run" || b.kind !== "run") throw new Error()
    expect(a.options.saveConfig).toBe(true)
    expect(b.options.saveConfig).toBe("presets/team.json")
  })

  it("returns help and version without running", () => {
    expect(parse("--help").kind).toBe("exit")
    expect(parse("--version").kind).toBe("exit")
  })

  it("rejects unknown options and invalid choices", () => {
    expect(() => parse("--bogus")).toThrow(ProduxError)
    expect(() => parse("x", "--preset", "huge")).toThrow(/huge/)
    expect(() => parse("x", "--package-manager", "pip")).toThrow(/pip/)
  })

  it("detects conflicting options", () => {
    expect(() => parse("x", "--mode", "standalone", "--app-dir", "apps/web")).toThrow(/--app-dir/)
    expect(() => parse("x", "--mode", "standalone", "--turbo")).toThrow(/--turbo/)
    expect(() => parse("x", "--mode", "existing-workspace", "--turbo")).toThrow(/detected/)
    expect(() => parse("x", "--dry-run", "--save-config")).toThrow(/--dry-run/)
    expect(() => parse("x", "--router", "none", "--features", "react-router")).toThrow(/--router/)
  })
})

describe("--allow-workspace-changes", () => {
  it("is off unless given", () => {
    const a = parse("web", "--mode", "existing-workspace")
    const b = parse("web", "--mode", "existing-workspace", "--allow-workspace-changes")
    if (a.kind !== "run" || b.kind !== "run") throw new Error()
    expect(a.options.allowWorkspaceChanges).toBe(false)
    expect(b.options.allowWorkspaceChanges).toBe(true)
  })

  it("only applies to existing workspaces", () => {
    expect(() => parse("x", "--mode", "standalone", "--allow-workspace-changes")).toThrow(/existing-workspace/)
  })
})

describe("--app-dir validation (review findings)", () => {
  it.each([["/abs/ws/apps/web"], ["../x"], ["apps/my web"], ["apps/web#x"], ["apps/o'brien"], ["C:web"], ["apps\\\\web"]])(
    "rejects %j",
    (dir) => {
      expect(() => parse("web", "--mode", "existing-workspace", "--app-dir", dir)).toThrow(/--app-dir/)
    }
  )

  it("accepts a plain relative directory", () => {
    expect(parse("web", "--mode", "existing-workspace", "--app-dir", "tools/web-app_2").kind).toBe("run")
  })
})

describe("review findings after 0.1.0", () => {
  it("rejects an empty --features list instead of silently using the preset", () => {
    expect(() => parse("x", "--features", "")).toThrow(/--features/)
  })

  it("validates the interactive app directory like --app-dir", () => {
    expect(appDirValidator("apps/it's web")).toMatch(/relative path/)
    expect(appDirValidator("apps/web")).toBeUndefined()
    // Empty input means "use the default".
    expect(appDirValidator("")).toBeUndefined()
  })
})
