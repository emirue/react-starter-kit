import { spawnSync } from "node:child_process"

import { execa, type ResultPromise } from "execa"

export interface CommandResult {
  ok: boolean
  exitCode: number | undefined
  /** Interleaved stdout and stderr. */
  output: string
  command: string
}

/**
 * Runs a program with an argument array: no shell, so user input is never
 * interpreted as shell syntax. stdin is ignored so nothing can block on a prompt.
 */
export async function runCommand(file: string, args: string[], cwd: string, env: Record<string, string> = {}): Promise<CommandResult> {
  // Its own process group (POSIX), so a cancel can stop everything the command started: package
  // managers re-launch themselves (pnpm switching to the version in "packageManager").
  const subprocess = execa(file, args, { cwd, env, reject: false, all: true, stdin: "ignore", detached: process.platform !== "win32" })
  running.add(subprocess)
  try {
    const r = await subprocess
    return {
      // A missing program has no exit code; `failed` covers both cases.
      ok: !r.failed,
      exitCode: r.exitCode,
      output: r.all ?? "",
      command: [file, ...args].join(" "),
    }
  } finally {
    running.delete(subprocess)
  }
}

const running = new Set<ResultPromise>()
const signalGroup = (pid: number, signal: NodeJS.Signals | 0) => {
  try {
    process.kill(-pid, signal)
    return true
  } catch {
    return false
  }
}
const isAlive = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}
async function gone(alive: () => boolean, ms: number): Promise<boolean> {
  for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 25))) {
    if (!alive()) return true
  }
  return !alive()
}
const groupGone = (pid: number, ms: number) => gone(() => signalGroup(pid, 0), ms)

/**
 * PIDs taskkill reports as terminated: "The process with PID <killed> (child process of PID <parent>)".
 * The root's parent is this CLI, so only the first PID of each line counts.
 */
export function killedPids(taskkillOutput: string): number[] {
  // ponytail: English output; a localized message without "PID <n> (" leaves only the direct child awaited,
  // as before. Upgrade path: list the tree with Win32_Process before killing.
  return [...taskkillOutput.matchAll(/PID (\d+) \(/g)].map((m) => Number(m[1]))
}

/** taskkill /T /F starts terminating the tree and returns; the processes it names may still run for a moment. */
async function killTreeWindows(pid: number, ms: number) {
  const r = spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { encoding: "utf8" })
  const pids = killedPids(r.stdout ?? "")
  await gone(() => pids.some(isAlive), ms)
}

/** Stops every running command and every process it started, and returns once they are gone (Ctrl+C, before the rollback). */
export async function stopRunningCommands(timeoutMs = 5000): Promise<void> {
  await Promise.all(
    [...running].map(async (subprocess) => {
      const pid = subprocess.pid
      if (pid === undefined) return
      if (process.platform === "win32") await killTreeWindows(pid, timeoutMs)
      else {
        signalGroup(pid, "SIGINT")
        if (!(await groupGone(pid, timeoutMs / 2))) signalGroup(pid, "SIGKILL")
        await groupGone(pid, timeoutMs / 2)
      }
      await subprocess
    })
  )
}

// Detached commands are not cleaned up by execa: never leave them running when the CLI exits.
process.on("exit", () => {
  for (const subprocess of running) {
    if (subprocess.pid === undefined) continue
    if (process.platform === "win32") subprocess.kill()
    else signalGroup(subprocess.pid, "SIGKILL")
  }
})

export async function commandVersion(file: string): Promise<string | undefined> {
  const r = await execa(file, ["--version"], { reject: false, stdin: "ignore" })
  // stdout only: Corepack prints download notices with versioned URLs (pnpm-12.23.0.tgz) on stderr.
  return r.failed ? undefined : /^v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)*)\s*$/m.exec(r.stdout)?.[1]
}
