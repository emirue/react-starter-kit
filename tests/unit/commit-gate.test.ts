import { describe, expect, it } from "vitest"

import { gateProblem, ranVerification } from "../../.claude/hooks/commit-gate.ts"

const line = (entry: unknown) => JSON.stringify(entry)
const skill = (name: string) =>
  line({ type: "assistant", message: { content: [{ type: "tool_use", name: "Skill", input: { skill: name } }] } })
const typed = (command: string) =>
  line({ type: "user", message: { content: `<command-name>${command}</command-name>\n<command-args></command-args>` } })

describe("ranVerification", () => {
  it("finds /verify and /code-review run as skills or typed by the user", () => {
    expect(ranVerification(skill("verify"))).toBe(true)
    expect(ranVerification(skill("code-review"))).toBe(true)
    expect(ranVerification(typed("/verify"))).toBe(true)
    expect(ranVerification(typed("/code-review"))).toBe(true)
  })

  it("ignores other skills and text that only mentions them", () => {
    expect(ranVerification(skill("superpowers:verification-before-completion"))).toBe(false)
    expect(ranVerification(skill("other-plugin:verify"))).toBe(false)
    expect(ranVerification(typed("/goal"))).toBe(false)
    expect(ranVerification(typed("/verify-plan"))).toBe(false)
    const written = line({
      type: "assistant",
      message: { content: [{ type: "tool_use", name: "Write", input: { content: skill("verify") } }] },
    })
    expect(ranVerification(written)).toBe(false)
    expect(ranVerification('not json "verify"')).toBe(false)
  })
})

describe("gateProblem", () => {
  const commit = (message: string) => `git commit -m "$(cat <<'EOF'\n${message}\nEOF\n)"`

  it("requires a Verified line", () => {
    expect(gateProblem(commit("fix: x"), true)).toMatch(/no "Verified: <how>" line/)
  })

  it("accepts a claimed verification only when one ran in the session", () => {
    expect(gateProblem(commit("fix: x\n\nVerified: /verify (test:run 273/273)"), true)).toBeUndefined()
    expect(gateProblem(commit("fix: x\n\nVerified: /verify (test:run 273/273)"), false)).toMatch(/Run \/verify or \/code-review/)
  })

  it('accepts "Verified: none" with a reason, without a verification run', () => {
    expect(gateProblem(commit("docs: x\n\nVerified: none (docs only)"), false)).toBeUndefined()
    expect(gateProblem(commit("docs: x\n\nVerified: none"), false)).toMatch(/Give the reason/)
  })
})
