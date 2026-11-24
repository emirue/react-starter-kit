#!/usr/bin/env node
import * as p from "@clack/prompts"

import { parseCliArgs } from "./cli/options.ts"
import { CancelledError } from "./cli/prompts.ts"
import { run } from "./core/run.ts"
import { ProduxError } from "./utils/errors.ts"

async function main(): Promise<number> {
  try {
    const parsed = parseCliArgs(process.argv.slice(2))
    if (parsed.kind === "exit") return parsed.code
    return await run(parsed.options)
  } catch (e) {
    if (e instanceof CancelledError) {
      p.cancel("Cancelled. Nothing was written.")
      return 130
    }
    if (e instanceof ProduxError) {
      p.log.error(e.issues.join("\n"))
      if (e.hint) p.log.info(e.hint)
      p.outro("No files were changed.")
      return 1
    }
    throw e
  }
}

process.exitCode = await main()
