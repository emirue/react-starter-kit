import { execa } from "execa"

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
  const r = await execa(file, args, { cwd, env, reject: false, all: true, stdin: "ignore" })
  return {
    // A missing program has no exit code; `failed` covers both cases.
    ok: !r.failed,
    exitCode: r.exitCode,
    output: r.all ?? "",
    command: [file, ...args].join(" "),
  }
}

export async function commandVersion(file: string): Promise<string | undefined> {
  const r = await runCommand(file, ["--version"], process.cwd())
  return r.ok ? /\d+\.\d+\.\d+\S*/.exec(r.output)?.[0] : undefined
}
