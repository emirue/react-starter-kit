/**
 * Compares src/config/dependency-versions.json with the latest stable
 * releases on npm. Informational by default; --strict exits 1 when behind.
 *
 *   node scripts/check-versions.ts [--strict]
 */
import { execFileSync } from "node:child_process"

import versions from "../src/config/dependency-versions.json" with { type: "json" }

const STABLE = /^\d+\.\d+\.\d+$/
const rows: string[] = []
let behind = 0

for (const [name, pinned] of Object.entries(versions as Record<string, string>)) {
  let latest = "?"
  try {
    latest = JSON.parse(execFileSync("npm", ["view", name, "dist-tags.latest", "--json"], { encoding: "utf8" })) as string
  } catch {
    // network or registry error: reported as "?"
  }
  // The latest tag is not proof of stability; prereleases are ignored.
  const outdated = STABLE.test(latest) && latest !== pinned
  if (outdated) behind++
  rows.push(`| ${name} | ${pinned} | ${latest} | ${outdated ? "update available" : "ok"} |`)
}

console.log("| Package | Pinned | npm latest | Status |\n| --- | --- | --- | --- |\n" + rows.join("\n"))
console.log(`\n${behind} package(s) behind. Updates must pass the validation matrix (docs/releasing.md).`)
if (process.argv.includes("--strict") && behind) process.exitCode = 1
