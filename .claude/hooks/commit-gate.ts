// PreToolUse (git commit): every commit message records how the change was verified, and a claimed
// verification needs /verify or /code-review run in this session.
//   Verified: /verify (pnpm test:run 273/273, validate.ts --only minimal 10/10)
//   Verified: none (docs only)
// Mode (first argument): off | observe (log what would be blocked) | enforce (block; after two blocks in
// a session the next commit passes, so Claude is never stuck). Log: <git dir>/claude-commit-gate.jsonl
import { execFileSync } from "node:child_process"
import { appendFileSync, existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const VERIFIERS = new Set(["verify", "code-review"])
const TYPED = /<command-name>\/(verify|code-review)<\/command-name>/
// `git [-C <dir>] [--option] commit`, anywhere in a compound command; not commit-tree or a mention.
const COMMIT = /\bgit(?:\s+(?:-[Cc]\s+\S+|--?[\w-]+(?:=\S+)?))*\s+commit(?=\s|$)/

const parse = (line: string) => {
  try {
    return JSON.parse(line)
  } catch {
    return undefined
  }
}

/** Whether the session transcript (JSONL) shows /verify or /code-review: typed by the user, or a Skill call that succeeded. */
export function ranVerification(transcript: string): boolean {
  const calls = new Set<string>()
  for (const line of transcript.split("\n")) {
    const mayAnswerCall = [...calls].some((id) => line.includes(id))
    if (!mayAnswerCall && !line.includes("verify") && !line.includes("code-review")) continue
    const entry = parse(line)
    const content = entry?.message?.content
    const parts = typeof content === "string" ? [{ type: "text", text: content }] : Array.isArray(content) ? content : []
    for (const c of parts) {
      if (entry.type === "user" && c.type === "text" && TYPED.test(c.text)) return true
      if (entry.type === "user" && c.type === "tool_result" && calls.has(c.tool_use_id) && !c.is_error) return true
      if (entry.type === "assistant" && c.type === "tool_use" && c.name === "Skill" && VERIFIERS.has(c.input?.skill)) {
        calls.add(c.id)
      }
    }
  }
  return false
}

/** Why this commit would be blocked, or undefined when it may proceed (also for commands that are not commits). */
export function gateProblem(command: string, verified: boolean): string | undefined {
  if (!COMMIT.test(command)) return undefined
  const stamp = /^\s*Verified:[ \t]*(.*)$/im.exec(command)?.[1]?.trim()
  if (!stamp) return 'The commit message has no "Verified: <how>" line ("Verified: none (<reason>)" when nothing was verified).'
  if (/^none\b/i.test(stamp)) return /^none\W+\w/i.test(stamp) ? undefined : 'Give the reason: "Verified: none (<reason>)".'
  if (!verified) return 'Run /verify or /code-review in this session before committing, or write "Verified: none (<reason>)".'
  return undefined
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2] ?? "observe"
  if (mode === "off") process.exit(0)
  const input = JSON.parse(readFileSync(0, "utf8"))
  const root: string = process.env.CLAUDE_PROJECT_DIR ?? input.cwd
  const transcript = input.transcript_path && existsSync(input.transcript_path) ? readFileSync(input.transcript_path, "utf8") : ""
  const problem = gateProblem(input.tool_input?.command ?? "", ranVerification(transcript))
  if (!problem) process.exit(0)

  const log = resolve(
    root,
    execFileSync("git", ["rev-parse", "--git-path", "claude-commit-gate.jsonl"], { cwd: root, encoding: "utf8" }).trim()
  )
  const earlier = existsSync(log)
    ? readFileSync(log, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    : []
  const blocked = earlier.filter((e) => e.session === input.session_id && e.decision === "blocked").length
  const decision = mode === "enforce" ? (blocked >= 2 ? "passed after two blocks" : "blocked") : "would block"
  const record = { time: new Date().toISOString(), session: input.session_id, mode, decision, problem }
  appendFileSync(log, `${JSON.stringify({ ...record, command: String(input.tool_input?.command).split("\n")[0] })}\n`)
  if (decision !== "blocked") process.exit(0)
  process.stderr.write(`Commit gate: ${problem}\n`)
  process.exit(2)
}
