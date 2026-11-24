import { describe, expect, it } from "vitest"

import { FEATURES, type FeatureDef } from "../../src/core/features.ts"
import { PRESETS } from "../../src/core/presets.ts"
import { resolveFeatures } from "../../src/core/resolve-features.ts"
import { ProduxError } from "../../src/utils/errors.ts"

const ids = (r: { features: string[] }) => r.features

function issuesOf(fn: () => unknown): string[] {
  try {
    fn()
  } catch (e) {
    if (e instanceof ProduxError) return e.issues
    throw e
  }
  throw new Error("expected ProduxError")
}

describe("resolveFeatures", () => {
  it("auto-adds required features and reports why", () => {
    const r = resolveFeatures({ include: ["shadcn"], mode: "standalone" })
    expect(ids(r)).toEqual(expect.arrayContaining(["shadcn", "tailwind", "lucide"]))
    expect(r.added).toContainEqual({ id: "tailwind", requiredBy: "shadcn" })
  })

  it("resolves transitive requirements", () => {
    const r = resolveFeatures({ include: ["lint-staged"], mode: "standalone" })
    expect(ids(r)).toEqual(expect.arrayContaining(["lint-staged", "husky"]))
  })

  it("returns features in registry order regardless of input order", () => {
    const a = resolveFeatures({ include: ["zustand", "tailwind"], mode: "standalone" })
    const b = resolveFeatures({ include: ["tailwind", "zustand"], mode: "standalone" })
    expect(ids(a)).toEqual(ids(b))
    const order = FEATURES.map((f) => f.id)
    expect([...ids(a)].sort((x, y) => order.indexOf(x) - order.indexOf(y))).toEqual(ids(a))
  })

  it("rejects unknown feature ids", () => {
    const issues = issuesOf(() => resolveFeatures({ include: ["tailwind", "nope"], mode: "standalone" }))
    expect(issues.join("\n")).toMatch(/Unknown feature "nope"/)
  })

  it("rejects conflicting features", () => {
    const issues = issuesOf(() => resolveFeatures({ include: ["react-router", "tanstack-router"], mode: "standalone" }))
    expect(issues.join("\n")).toMatch(/react-router.*conflicts.*tanstack-router/)
  })

  it("explains when an excluded feature is required by a selected one", () => {
    const issues = issuesOf(() => resolveFeatures({ include: ["shadcn"], exclude: ["tailwind"], mode: "standalone" }))
    expect(issues.join("\n")).toMatch(/"shadcn" requires "tailwind".*keep "tailwind" or remove "shadcn"/)
  })

  it("drops excluded features that nothing requires", () => {
    const r = resolveFeatures({ include: ["zustand", "tailwind"], exclude: ["zustand"], mode: "standalone" })
    expect(ids(r)).not.toContain("zustand")
  })

  it("rejects features unsupported in the project mode", () => {
    const issues = issuesOf(() => resolveFeatures({ include: ["pkg-ui"], mode: "standalone" }))
    expect(issues.join("\n")).toMatch(/"pkg-ui" is not available in standalone mode/)
  })

  it("satisfies requiresOneOf with the first option unless one is already selected", () => {
    expect(ids(resolveFeatures({ include: ["orval"], mode: "standalone", allowUnverified: true }))).toContain("fetch")
    const withAxios = ids(resolveFeatures({ include: ["orval", "axios"], mode: "standalone", allowUnverified: true }))
    expect(withAxios).toContain("axios")
    expect(withAxios).not.toContain("fetch")
  })

  it("detects circular requirements in a registry", () => {
    const reg: FeatureDef[] = [
      { id: "a", name: "A", description: "", group: "ui", requires: ["b"] },
      { id: "b", name: "B", description: "", group: "ui", requires: ["a"] },
    ]
    const issues = issuesOf(() => resolveFeatures({ include: ["a"], mode: "standalone" }, reg))
    expect(issues.join("\n")).toMatch(/Circular requirement: a -> b -> a/)
  })

  it("the shipped registry has no dangling references or cycles", () => {
    const known = new Set(FEATURES.map((f) => f.id))
    for (const f of FEATURES) {
      for (const r of [...(f.requires ?? []), ...(f.conflicts ?? []), ...(f.requiresOneOf ?? []).flat()]) {
        expect(known.has(r), `${f.id} -> ${r}`).toBe(true)
      }
      expect(() => resolveFeatures({ include: [f.id], mode: f.modes?.[0] ?? "standalone", allowUnverified: true })).not.toThrow()
    }
  })

  it("every preset resolves without adding unlisted features", () => {
    for (const preset of PRESETS) {
      const r = resolveFeatures({ include: preset.features, mode: "standalone", allowUnverified: true })
      expect(r.added, preset.id).toEqual([])
    }
  })
})

describe("resolveFeatures package-manager support", () => {
  it("rejects features not verified with the package manager", () => {
    const issues = issuesOf(() => resolveFeatures({ include: ["github-actions"], mode: "standalone", packageManager: "bun" }))
    expect(issues.join("\n")).toMatch(/"github-actions" is not supported with bun/)
    expect(() => resolveFeatures({ include: ["github-actions"], mode: "standalone", packageManager: "npm" })).not.toThrow()
  })
})

describe("feature verification status", () => {
  it("rejects unverified features unless explicitly allowed", () => {
    const reg: FeatureDef[] = [{ id: "beta", name: "Beta", description: "", group: "ui", unverified: true }]
    const issues = issuesOf(() => resolveFeatures({ include: ["beta"], mode: "standalone" }, reg))
    expect(issues.join("\n")).toMatch(/"beta" is not available in this release/)
    expect(resolveFeatures({ include: ["beta"], mode: "standalone", allowUnverified: true }, reg).features).toEqual(["beta"])
  })

  it("every verified feature is exercised by a validation scenario", async () => {
    const { SCENARIOS } = await import("../../scripts/scenarios.ts")
    const covered = new Set(SCENARIOS.filter((s) => !s.expectExit).flatMap((s) => s.features))
    const missing = FEATURES.filter((f) => !f.unverified && !covered.has(f.id)).map((f) => f.id)
    expect(missing).toEqual([])
  })
})
