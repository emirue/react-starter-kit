import { describe, expect, it } from "vitest"

import { CONFIG_SCHEMA_VERSION, parseConfigFile, serializeConfig } from "../../src/core/config-schema.ts"
import { ProduxError } from "../../src/utils/errors.ts"

const valid = {
  schemaVersion: 1,
  mode: "standalone",
  packageManager: "pnpm",
  preset: "standard",
  features: ["tailwind", "eslint"],
  ui: { base: "radix", style: "nova" },
  examples: true,
}

function issues(input: unknown): string {
  try {
    parseConfigFile(input)
  } catch (e) {
    if (e instanceof ProduxError) return e.issues.join("\n")
    throw e
  }
  throw new Error("expected ProduxError")
}

describe("parseConfigFile", () => {
  it("accepts a valid config and fills defaults", () => {
    const c = parseConfigFile({ schemaVersion: 1, preset: "minimal" })
    expect(c.preset).toBe("minimal")
    expect(c.examples).toBe(true)
    expect(c.features).toBeUndefined()
  })

  it("round-trips through serializeConfig", () => {
    const c = parseConfigFile(valid)
    expect(parseConfigFile(JSON.parse(serializeConfig(c)))).toEqual(c)
  })

  it("rejects unknown keys at any level", () => {
    expect(issues({ ...valid, apiKey: "x" })).toMatch(/apiKey/)
    expect(issues({ ...valid, ui: { base: "base", colour: "red" } })).toMatch(/colour/)
  })

  it("rejects invalid enum values with the field path", () => {
    expect(issues({ ...valid, packageManager: "pip" })).toMatch(/packageManager/)
  })

  it("requires a known schemaVersion", () => {
    expect(issues({ preset: "standard" })).toMatch(/schemaVersion/)
    expect(issues({ ...valid, schemaVersion: CONFIG_SCHEMA_VERSION + 1 })).toMatch(/newer version of create-produx-app/)
  })

  it("rejects absolute or escaping appDir values", () => {
    expect(issues({ ...valid, mode: "monorepo", workspace: { appDir: "/etc/web" } })).toMatch(/appDir/)
    expect(issues({ ...valid, mode: "monorepo", workspace: { appDir: "../web" } })).toMatch(/appDir/)
  })

  it("serializes keys in a stable order with a trailing newline", () => {
    const a = serializeConfig(parseConfigFile(valid))
    const b = serializeConfig(parseConfigFile({ ...valid, features: ["eslint", "tailwind"].reverse() }))
    expect(a).toBe(b)
    expect(a.endsWith("}\n")).toBe(true)
    expect(Object.keys(JSON.parse(a))[0]).toBe("schemaVersion")
  })
})

describe("appDir in config files (review findings)", () => {
  it.each([["C:web"], ["apps/my web"], ["apps/web#x"]])("rejects %j", (appDir) => {
    expect(issues({ ...valid, mode: "monorepo", workspace: { appDir } })).toMatch(/appDir/)
  })
})
