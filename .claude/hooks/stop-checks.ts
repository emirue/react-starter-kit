// Stop: when the checkout changed since the last green run, run the fast checks before Claude finishes.
// A failure exits 2, so Claude keeps working on it. After three blocked stops in a session the hook
// lets Claude stop, so it reports to the user instead of looping.
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

import { execaSync } from "execa"

const CHECKS = ["typecheck", "lint", "format:check", "test:run"]
const MAX_BLOCKS = 3

const input = JSON.parse(readFileSync(0, "utf8"))
const root: string = process.env.CLAUDE_PROJECT_DIR ?? input.cwd
const session: string = input.session_id ?? "unknown"
const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 })

// HEAD, tracked changes and untracked files: a new commit or any edit invalidates the last green run.
const hash = createHash("sha256")
  .update(git("rev-parse", "HEAD"))
  .update(git("diff", "HEAD", "--binary"))
for (const f of git("ls-files", "--others", "--exclude-standard", "-z").split("\0").filter(Boolean)) {
  hash.update(f).update(readFileSync(join(root, f)))
}
const fingerprint = hash.digest("hex")

const statePath = resolve(root, git("rev-parse", "--git-path", "claude-stop-checks.json").trim())
const state: { green?: string; blocks: Record<string, number> } = existsSync(statePath)
  ? JSON.parse(readFileSync(statePath, "utf8"))
  : { blocks: {} }
if (state.green === fingerprint) process.exit(0)

const failures = CHECKS.flatMap((script) => {
  // execa, not a shell: it finds pnpm.cmd on Windows without concatenating arguments.
  const r = execaSync("pnpm", ["run", script], { cwd: root, reject: false })
  if (r.exitCode === 0) return []
  const output = `${r.stdout}${r.stderr}`.trim().split("\n").slice(-40).join("\n")
  return [{ script, output }]
})
const save = () => writeFileSync(statePath, `${JSON.stringify(state)}\n`)

if (!failures.length) {
  state.green = fingerprint
  delete state.blocks[session]
  save()
  process.exit(0)
}
const blocks = (state.blocks[session] ?? 0) + 1
state.blocks[session] = blocks
save()
if (blocks > MAX_BLOCKS) {
  const failed = failures.map((f) => `pnpm run ${f.script}`).join(", ")
  console.log(JSON.stringify({ systemMessage: `Checks still fail after ${MAX_BLOCKS} attempts (${failed}); stopping for the user.` }))
  process.exit(0)
}
process.stderr.write(
  `${failures.map((f) => `pnpm run ${f.script} failed:\n${f.output}`).join("\n\n")}\n\n` +
    `Fix the cause and finish again (attempt ${blocks} of ${MAX_BLOCKS}). ` +
    "Do not rerun until it passes, add sleeps or skip tests. After the last attempt, tell the user what failed and what you tried.\n"
)
process.exit(2)
