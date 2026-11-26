import { describe, expect, it } from "vitest"

import { gateProblem, ranVerification } from "../../.claude/hooks/commit-gate.ts"

const line = (entry: unknown) => JSON.stringify(entry)
const call = (name: string, id = "toolu_1") =>
  line({ type: "assistant", message: { content: [{ type: "tool_use", id, name: "Skill", input: { skill: name } }] } })
const result = (isError: boolean, id = "toolu_1") =>
  line({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: id, is_error: isError, content: "…" }] } })
/** A Skill call and its successful result. */
const skill = (name: string) => [call(name), result(false)].join("\n")
const typed = (command: string) =>
  line({ type: "user", message: { content: `<command-name>${command}</command-name>\n<command-args></command-args>` } })

describe("ranVerification", () => {
  it("finds /verify and /code-review run as skills or typed by the user", () => {
    expect(ranVerification(skill("verify"))).toBe(true)
    expect(ranVerification(skill("code-review"))).toBe(true)
    expect(ranVerification(typed("/verify"))).toBe(true)
    expect(ranVerification(typed("/code-review"))).toBe(true)
  })

  it("does not count a Skill call that failed or has no result", () => {
    // Seen in this repository: the Skill tool refused "verify" and the gate still counted it.
    expect(ranVerification([call("verify"), result(true)].join("\n"))).toBe(false)
    expect(ranVerification(call("verify"))).toBe(false)
    expect(ranVerification([call("verify", "toolu_1"), result(false, "toolu_2")].join("\n"))).toBe(false)
    // Another tool's successful result that mentions verify (grep output, a log line).
    const otherResult = line({
      type: "user",
      message: { content: [{ type: "tool_result", tool_use_id: "toolu_2", is_error: false, content: "ran /verify" }] },
    })
    expect(ranVerification([call("verify", "toolu_1"), result(true, "toolu_1"), otherResult].join("\n"))).toBe(false)
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

  it("checks commits however they are written", () => {
    expect(gateProblem('git add -A && git commit -m "fix: x"', false)).toMatch(/no "Verified/)
    expect(gateProblem('git -C sub --no-pager commit -q -m "fix: x"', false)).toMatch(/no "Verified/)
  })

  it("ignores commands that are not commits", () => {
    // Seen in this repository: the hook's "if" filter still ran the gate for these.
    expect(gateProblem('cat "$(git rev-parse --git-path claude-commit-gate.jsonl)"', false)).toBeUndefined()
    expect(gateProblem("git commit-tree HEAD^{tree} -m x", false)).toBeUndefined()
    expect(gateProblem("git log --grep commit", false)).toBeUndefined()
    expect(gateProblem("for f in a b; do node check.ts; done", false)).toBeUndefined()
  })
})
