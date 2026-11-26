import { existsSync } from "node:fs"
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { commandVersion, killedPids, runCommand, stopRunningCommands } from "../../src/utils/exec.ts"

const isAlive = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const dirs: string[] = []
afterEach(async () => {
  for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true })
})

/** An executable that prints `stderr` to stderr, then `stdout` to stdout. */
async function fakeCommand(stdout: string, stderr = "") {
  const dir = await mkdtemp(join(tmpdir(), "produx-exec-"))
  dirs.push(dir)
  if (process.platform === "win32") {
    // Windows runs .cmd files, not shebang scripts (as for the pnpm.cmd and npm.cmd shims).
    const file = join(dir, "fake-pm.cmd")
    const lines = (text: string, redirect: string) =>
      text
        .split("\n")
        .filter(Boolean)
        .map((l) => `echo ${l}${redirect}`)
    await writeFile(file, ["@echo off", ...lines(stderr, " 1>&2"), ...lines(stdout, "")].join("\r\n") + "\r\n")
    return file
  }
  const file = join(dir, "fake-pm")
  await writeFile(
    file,
    `#!/usr/bin/env node\nprocess.stderr.write(${JSON.stringify(stderr)})\nprocess.stdout.write(${JSON.stringify(stdout)})\n`
  )
  await chmod(file, 0o755)
  return file
}

describe("commandVersion", () => {
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

describe("killedPids", () => {
  it("reads the terminated processes from taskkill /T, not their parents", () => {
    const output = [
      "SUCCESS: The process with PID 4321 (child process of PID 1234) has been terminated.",
      "SUCCESS: The process with PID 1234 (child process of PID 999) has been terminated.",
      "",
    ].join("\r\n")
    // 999 is the CLI itself: waiting for it to exit would always time out.
    expect(killedPids(output)).toEqual([4321, 1234])
    expect(killedPids("")).toEqual([])
  })
})

describe("stopRunningCommands", () => {
  // Ctrl+C rolls back after this. A package manager that re-launched itself (pnpm switching to the
  // version in "packageManager") kept writing after its parent was gone, so a directory survived the rollback.
  it("stops the whole process tree of a running command before returning", async () => {
    // Three rounds: on windows-latest the grandchild still wrote after the call returned in one of four CI runs
    // (taskkill /F starts the termination and returns).
    for (let round = 0; round < 3; round++) {
      const dir = await mkdtemp(join(tmpdir(), "produx-stop-"))
      dirs.push(dir)
      const marker = join(dir, "written-by-grandchild")
      const grandchild = `setInterval(() => require("fs").writeFileSync(${JSON.stringify(marker)}, String(process.pid)), 20)`
      const parent = `require("child_process").spawn(process.execPath, ["-e", ${JSON.stringify(grandchild)}], { stdio: "ignore" }); setInterval(() => {}, 1000)`
      const running = runCommand(process.execPath, ["-e", parent], dir)
      for (let i = 0; i < 100 && !existsSync(marker); i++) await new Promise((r) => setTimeout(r, 20))
      const grandchildPid = Number(await readFile(marker, "utf8"))
      expect(isAlive(grandchildPid)).toBe(true)

      await stopRunningCommands()
      expect(isAlive(grandchildPid), `grandchild ${grandchildPid} after stopRunningCommands`).toBe(false)
      expect((await running).ok).toBe(false)
      await rm(marker, { force: true })
      await new Promise((r) => setTimeout(r, 300))
      expect(existsSync(marker)).toBe(false)
    }
  }, 30_000)
})
