import { describe, expect, it } from "vitest"

import { recordedPmVersion } from "../../src/adapters/package-manager.ts"
import versions from "../../src/config/dependency-versions.json" with { type: "json" }

describe("recordedPmVersion", () => {
  it("replaces a pnpm release deprecated as broken with the verified version", () => {
    // pnpm 11.13.0: "This is a broken version"; pnpm/action-setup refuses it in generated CI.
    expect(recordedPmVersion("pnpm", "11.13.0")).toEqual({ version: versions.pnpm, replaced: "11.13.0" })
  })

  it("keeps other versions and other package managers", () => {
    expect(recordedPmVersion("pnpm", "11.29.0")).toEqual({ version: "11.29.0" })
    expect(recordedPmVersion("npm", "11.13.0")).toEqual({ version: "11.13.0" })
  })
})
