import { describe, expect, it } from "vitest"

import { satisfies } from "../../src/utils/node-version.ts"

const REQ = "^22.22.2 || ^24.15.0 || >=26.0.0"

describe("satisfies", () => {
  it.each([
    ["v22.22.2", true],
    ["v22.23.5", true],
    ["v22.22.1", false],
    ["v23.11.1", false],
    ["v24.14.0", false],
    ["v24.15.0", true],
    ["v25.9.0", false],
    ["v26.13.1", true],
    ["v27.0.0-alpha.0", true],
    ["v20.19.0", false],
  ])("%s -> %s", (version, expected) => {
    expect(satisfies(version, REQ)).toBe(expected)
  })

  it("rejects ranges it does not understand", () => {
    expect(() => satisfies("v22.0.0", "~22.1")).toThrow(/range/)
  })
})
