// PostToolUse (Edit|Write): format-check and lint the file Claude just changed.
// Exit 2 shows the problems to Claude, which fixes them; files the tools ignore (templates/) pass.
import { readFileSync } from "node:fs"
import { extname, isAbsolute, relative } from "node:path"

import { execaSync } from "execa"

const input = JSON.parse(readFileSync(0, "utf8"))
const root: string = process.env.CLAUDE_PROJECT_DIR ?? input.cwd
const file: string | undefined = input.tool_input?.file_path
const rel = file ? relative(root, file) : ".."
if (rel.startsWith("..") || isAbsolute(rel)) process.exit(0)

// execa, not a shell: it finds pnpm.cmd on Windows and passes the path as one argument.
const exec = (args: string[]) => {
  const r = execaSync("pnpm", ["exec", ...args], { cwd: root, reject: false })
  if (r.exitCode === undefined) throw new Error(`pnpm did not run: ${r.stderr}`)
  return r
}
const problems: string[] = []
if (exec(["prettier", "--check", "--ignore-unknown", rel]).exitCode !== 0) {
  problems.push(`${rel} is not formatted: run pnpm exec prettier --write ${rel}`)
}
if ([".ts", ".js", ".mjs"].includes(extname(rel))) {
  // The root config always: ESLint would otherwise use the nearest eslint.config.js, and templates/ holds one
  // for generated projects.
  const eslint = exec(["eslint", "--config", "eslint.config.js", "--no-warn-ignored", rel])
  if (eslint.exitCode !== 0) problems.push(eslint.stdout + eslint.stderr)
}
if (problems.length) {
  process.stderr.write(problems.join("\n"))
  process.exit(2)
}
