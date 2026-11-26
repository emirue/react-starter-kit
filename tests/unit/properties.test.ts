// Property-based tests: rules that must hold for every input, checked on generated inputs (fast-check).
import { posix, win32 } from "node:path"

import fc from "fast-check"
import { describe, expect, it } from "vitest"

import { renderTemplate } from "../../src/core/template.ts"
import { toValidPackageName, validatePackageName, validateRelativeDir } from "../../src/utils/project-name.ts"

describe("toValidPackageName", () => {
  const input = fc.oneof(
    fc.string({ maxLength: 40 }),
    fc.string({ unit: "grapheme", maxLength: 20 }),
    fc.string({ minLength: 200, maxLength: 300 }),
    fc.constantFrom("node_modules", "Node_Modules", "favicon.ico", "@Scope/App", "  .hidden", "_private", "-")
  )

  it("suggests only names the CLI accepts", () => {
    // The suggestion is shown after an invalid name: `Try "<suggestion>"`.
    fc.assert(
      fc.property(input, (name) => {
        const suggestion = toValidPackageName(name)
        expect(suggestion === "" || validatePackageName(suggestion) === undefined, `suggestion "${suggestion}"`).toBe(true)
      })
    )
  })

  it("leaves a suggestion unchanged", () => {
    fc.assert(
      fc.property(input, (name) => {
        expect(toValidPackageName(toValidPackageName(name))).toBe(toValidPackageName(name))
      })
    )
  })
})

describe("validateRelativeDir", () => {
  // Mostly segments that try to leave the target or that one platform reads differently.
  const segment = fc.constantFrom("a", "..", "..", ".", "...", "x.", "C:", "\\", "~", " ", "")
  const dir = fc.oneof(
    { weight: 4, arbitrary: fc.array(segment, { minLength: 1, maxLength: 5 }).map((s) => s.join("/")) },
    { weight: 1, arbitrary: fc.string({ maxLength: 30 }) },
    { weight: 1, arbitrary: fc.string({ unit: "grapheme", maxLength: 10 }) }
  )

  it("accepts only directories inside the target, on POSIX and on Windows", () => {
    fc.assert(
      fc.property(dir, (d) => {
        if (validateRelativeDir(d) !== undefined) return
        expect(posix.resolve("/root", d).startsWith("/root/"), `posix "${d}"`).toBe(true)
        expect(win32.resolve("C:\\root", d).startsWith("C:\\root\\"), `win32 "${d}"`).toBe(true)
      }),
      { numRuns: 1000 }
    )
  })
})

describe("renderTemplate", () => {
  type Node = { text: string } | { expr: string; then: Node[]; otherwise: Node[] | undefined; style: number; indent: string }
  const FLAGS = ["a", "b", "c"]
  // Every comment style a directive may use, as [open, close].
  const STYLES = [
    ["// ", ""],
    ["# ", ""],
    ["/* ", " */"],
    ["{/* ", " */}"],
    ["<!-- ", " -->"],
  ] as const

  const flag = fc.constantFrom(...FLAGS, ...FLAGS.map((f) => `!${f}`))
  const expr = fc.oneof(
    flag,
    fc.tuple(flag, flag).map(([x, y]) => `${x} && ${y}`),
    fc.tuple(flag, flag, flag).map(([x, y, z]) => `${x} || ${y} && ${z}`)
  )
  const text = fc
    .constantFrom("const a = 1", "", "  <div>{x}</div>", "# Heading", "// a comment", "name: {{name}}")
    .map((t) => ({ text: t }))
  const nodes = (depth: number): fc.Arbitrary<Node[]> => fc.array(depth === 0 ? text : fc.oneof(text, block(depth - 1)), { maxLength: 4 })
  const block = (depth: number): fc.Arbitrary<Node> =>
    fc.record({
      expr,
      then: nodes(depth),
      otherwise: fc.option(nodes(depth), { nil: undefined }),
      style: fc.nat({ max: STYLES.length - 1 }),
      indent: fc.constantFrom("", "  "),
    })

  const directive = (n: Extract<Node, { expr: string }>, body: string) => {
    const [open, close] = STYLES[n.style]!
    return `${n.indent}${open}${body}${close}`
  }
  const print = (tree: Node[]): string[] =>
    tree.flatMap((n) =>
      "text" in n
        ? [n.text]
        : [
            directive(n, `@if ${n.expr}`),
            ...print(n.then),
            ...(n.otherwise ? [directive(n, "@else"), ...print(n.otherwise)] : []),
            directive(n, "@endif"),
          ]
    )
  // Reference semantics, written independently of the implementation: || of && of (possibly negated) flags.
  const holds = (e: string, on: Set<string>) =>
    e.split(" || ").some((g) => g.split(" && ").every((t) => (t.startsWith("!") ? !on.has(t.slice(1)) : on.has(t))))
  const model = (tree: Node[], on: Set<string>): string[] =>
    tree.flatMap((n) => ("text" in n ? [n.text] : holds(n.expr, on) ? model(n.then, on) : model(n.otherwise ?? [], on)))

  it("renders like the reference model for any nesting, flags and comment style", () => {
    fc.assert(
      fc.property(nodes(3), fc.subarray(FLAGS), (tree, enabled) => {
        const on = new Set(enabled)
        const expected = model(tree, on)
          .join("\n")
          .replaceAll("{{name}}", "app")
          .replace(/\n{3,}/g, "\n\n")
        expect(renderTemplate(print(tree).join("\n"), { flags: on, vars: { name: "app" } })).toBe(expected)
      })
    )
  })
})
