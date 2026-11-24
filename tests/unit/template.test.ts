import { describe, expect, it } from "vitest"

import { renderTemplate } from "../../src/core/template.ts"

const ctx = (flags: string[], vars: Record<string, string> = {}) => ({
  flags: new Set(flags),
  vars,
})

describe("renderTemplate", () => {
  it("keeps @if blocks whose flag is set and drops the directive lines", () => {
    const src = ["a", "// @if query", "b", "// @endif", "c"].join("\n")
    expect(renderTemplate(src, ctx(["query"]))).toBe("a\nb\nc")
    expect(renderTemplate(src, ctx([]))).toBe("a\nc")
  })

  it("supports @else, negation, && and ||", () => {
    const src = ["// @if shadcn && !radix", "base", "// @else", "other", "// @endif", "// @if a || b", "either", "// @endif"].join("\n")
    expect(renderTemplate(src, ctx(["shadcn"]))).toBe("base")
    expect(renderTemplate(src, ctx(["shadcn", "radix", "b"]))).toBe("other\neither")
  })

  it("supports nested blocks", () => {
    const src = ["// @if a", "A", "// @if b", "AB", "// @endif", "// @endif"].join("\n")
    expect(renderTemplate(src, ctx(["a"]))).toBe("A")
    expect(renderTemplate(src, ctx(["a", "b"]))).toBe("A\nAB")
    expect(renderTemplate(src, ctx(["b"]))).toBe("")
  })

  it("accepts JSX, hash and HTML comment directive forms", () => {
    const src = [
      "{/* @if x */}",
      "<X />",
      "{/* @endif */}",
      "# @if y",
      "y: 1",
      "# @endif",
      "<!-- @if z -->",
      "z",
      "<!-- @endif -->",
      "/* @if w */",
      "w {}",
      "/* @endif */",
    ].join("\n")
    expect(renderTemplate(src, ctx(["x", "y", "z", "w"]))).toBe("<X />\ny: 1\nz\nw {}")
    expect(renderTemplate(src, ctx([]))).toBe("")
  })

  it("replaces {{vars}} and throws on unknown vars", () => {
    expect(renderTemplate("name: {{appName}}", ctx([], { appName: "web" }))).toBe("name: web")
    expect(() => renderTemplate("{{missing}}", ctx([]))).toThrow(/missing/)
  })

  it("collapses blank-line runs left behind by removed blocks", () => {
    const src = ["a", "", "// @if x", "b", "// @endif", "", "c"].join("\n")
    expect(renderTemplate(src, ctx([]))).toBe("a\n\nc")
  })

  it("throws on unbalanced directives", () => {
    expect(() => renderTemplate("// @if a\nx", ctx([]))).toThrow(/@endif/)
    expect(() => renderTemplate("x\n// @endif", ctx([]))).toThrow(/@endif/)
    expect(() => renderTemplate("// @else", ctx([]))).toThrow(/@else/)
  })

  it("rejects malformed expressions instead of guessing", () => {
    expect(() => renderTemplate("// @if a &&\nx\n// @endif", ctx([]))).toThrow(/expression/)
  })
})
