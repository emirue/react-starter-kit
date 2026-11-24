export type PackageManager = "pnpm" | "npm" | "yarn" | "bun"

interface PmInfo {
  lockfile: string
  /** How a README tells people to run a script, e.g. "pnpm dev" / "npm run dev". */
  run: string
  /** One-off package execution, e.g. "pnpm dlx" / "npx". */
  dlx: string
  /** Run a locally installed binary, e.g. "pnpm exec" / "npx". */
  exec: string
  install: string[]
  runScript: (script: string) => string[]
  /** Run a script in one workspace package. */
  filterRun: (pkg: string, script: string) => string
}

export const PM: Record<PackageManager, PmInfo> = {
  pnpm: {
    lockfile: "pnpm-lock.yaml",
    run: "pnpm",
    dlx: "pnpm dlx",
    exec: "pnpm exec",
    install: ["pnpm", "install"],
    runScript: (s) => ["pnpm", "run", s],
    filterRun: (pkg, s) => `pnpm --filter ${pkg} ${s}`,
  },
  npm: {
    lockfile: "package-lock.json",
    run: "npm run",
    dlx: "npx",
    exec: "npx",
    install: ["npm", "install"],
    runScript: (s) => ["npm", "run", s],
    filterRun: (pkg, s) => `npm run ${s} --workspace ${pkg}`,
  },
  yarn: {
    lockfile: "yarn.lock",
    run: "yarn",
    dlx: "yarn dlx",
    exec: "yarn exec",
    install: ["yarn", "install"],
    runScript: (s) => ["yarn", "run", s],
    filterRun: (pkg, s) => `yarn workspace ${pkg} ${s}`,
  },
  bun: {
    lockfile: "bun.lock",
    run: "bun run",
    dlx: "bunx",
    exec: "bunx",
    install: ["bun", "install"],
    runScript: (s) => ["bun", "run", s],
    filterRun: (pkg, s) => `bun run --filter ${pkg} ${s}`,
  },
}

export const LOCKFILES: Record<string, PackageManager> = {
  "pnpm-lock.yaml": "pnpm",
  "package-lock.json": "npm",
  "yarn.lock": "yarn",
  "bun.lock": "bun",
  "bun.lockb": "bun",
}

/** Reads `npm_config_user_agent`, e.g. "pnpm/11.13.0 npm/? node/v26.13.0 darwin arm64". */
export function pmFromUserAgent(ua = process.env.npm_config_user_agent): { name: PackageManager; version: string } | undefined {
  const m = /^(pnpm|npm|yarn|bun)\/(\d+\.\d+\.\d+\S*)/.exec(ua ?? "")
  return m ? { name: m[1] as PackageManager, version: m[2]! } : undefined
}
