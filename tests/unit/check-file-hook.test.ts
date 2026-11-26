import { spawnSync } from "node:child_process"
import { rmSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const repo = resolve(import.meta.dirname, "../..")
const hook = (file: string) =>
  spawnSync(process.execPath, [".claude/hooks/check-file.ts"], {
    cwd: repo,
    encoding: "utf8",
    input: JSON.stringify({ cwd: repo, tool_input: { file_path: resolve(repo, file) } }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: repo },
  })

describe("check-file hook (PostToolUse)", () => {
  it("passes files the repository's ESLint config ignores, also below a nested eslint.config.js", () => {
    // Seen in this repository: ESLint 10 loaded templates/features/eslint/app/eslint.config.js (a
    // generated project's config) for files next to it and crashed on its missing plugins.
    const r = hook("templates/features/eslint/app/eslint.config.js")
    expect(r.stderr).toBe("")
    expect(r.status).toBe(0)
  }, 30_000)

  it("returns lint errors with exit 2 and passes clean files", () => {
    const probe = "__check-file-probe.ts"
    writeFileSync(resolve(repo, probe), "const unused = 1\n")
    try {
      const r = hook(probe)
      expect(r.status).toBe(2)
      expect(r.stderr).toContain("no-unused-vars")
    } finally {
      rmSync(resolve(repo, probe), { force: true })
    }
    expect(hook("src/core/template.ts").status).toBe(0)
  }, 30_000)
})
