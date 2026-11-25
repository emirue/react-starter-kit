import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { commandVersion } from "../../src/utils/exec.ts"

const dirs: string[] = []
afterEach(async () => {
  for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true })
})

/** An executable that prints `stderr` to stderr, then `stdout` to stdout. */
async function fakeCommand(stdout: string, stderr = "") {
  const dir = await mkdtemp(join(tmpdir(), "produx-exec-"))
  dirs.push(dir)
  const file = join(dir, "fake-pm")
  await writeFile(
    file,
    `#!/usr/bin/env node\nprocess.stderr.write(${JSON.stringify(stderr)})\nprocess.stdout.write(${JSON.stringify(stdout)})\n`
  )
  await chmod(file, 0o755)
  return file
}

describe.skipIf(process.platform === "win32")("commandVersion", () => {
  it("reads the version from stdout", async () => {
    expect(await commandVersion(await fakeCommand("11.29.0\n"))).toBe("11.29.0")
  })

  it("ignores Corepack's download notice on stderr", async () => {
    const notice = "! Corepack is about to download https://registry.npmjs.org/pnpm/-/pnpm-12.23.0.tgz\n"
    expect(await commandVersion(await fakeCommand("12.23.0\n", notice))).toBe("12.23.0")
  })

  it("keeps prerelease versions and rejects output that is not a version", async () => {
    expect(await commandVersion(await fakeCommand("9.0.0-beta.1\n"))).toBe("9.0.0-beta.1")
    expect(await commandVersion(await fakeCommand("not installed\n"))).toBeUndefined()
  })
})
