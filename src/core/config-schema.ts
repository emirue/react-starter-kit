import { z } from "zod"

import { ProduxError } from "../utils/errors.ts"
import { validateRelativeDir } from "../utils/project-name.ts"
import { FEATURE_IDS } from "./features.ts"

export const CONFIG_SCHEMA_VERSION = 1
export const CONFIG_FILE_NAME = "produx.config.json"

export const PROJECT_MODES = ["standalone", "monorepo", "existing-workspace"] as const
export const PACKAGE_MANAGERS = ["pnpm", "npm", "yarn", "bun"] as const
export const PRESET_IDS = ["minimal", "standard", "admin", "enterprise", "custom"] as const
export const UI_BASES = ["base", "radix"] as const
/**
 * shadcn presets this release ships verified components for. shadcn 4.23.0
 * also offers vega, maia, lyra, mira, luma, sera and rhea; add them by
 * re-vendoring with scripts/vendor-shadcn.sh and validating.
 */
export const UI_STYLES = ["nova"] as const

const relativeDir = z.string().superRefine((p, ctx) => {
  const error = validateRelativeDir(p)
  if (error) ctx.addIssue({ code: "custom", message: error })
})

// Reusable configuration only: no absolute paths, names of the user's
// machine, tokens or secrets. Unknown keys are rejected at every level.
const configV1 = z.strictObject({
  $schema: z.string().optional(),
  schemaVersion: z.literal(1),
  mode: z.enum(PROJECT_MODES).optional(),
  packageManager: z.enum(PACKAGE_MANAGERS).optional(),
  preset: z.enum(PRESET_IDS).optional(),
  features: z.array(z.enum(FEATURE_IDS as [string, ...string[]])).optional(),
  ui: z
    .strictObject({
      base: z.enum(UI_BASES).optional(),
      style: z.enum(UI_STYLES).optional(),
    })
    .optional(),
  workspace: z
    .strictObject({
      appName: z.string().min(1).optional(),
      appDir: relativeDir.optional(),
      turbo: z.boolean().optional(),
    })
    .optional(),
  examples: z.boolean().default(true),
})

export type ConfigFile = z.infer<typeof configV1>

/** Upgrade older config shapes here when schemaVersion is bumped. */
function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  const version = raw.schemaVersion
  if (typeof version !== "number") {
    throw new ProduxError(`Config: "schemaVersion" is required (current: ${CONFIG_SCHEMA_VERSION}).`)
  }
  if (version > CONFIG_SCHEMA_VERSION) {
    throw new ProduxError(
      `Config schemaVersion ${version} was written by a newer version of create-produx-app.`,
      "Upgrade with: npm create produx-app@latest"
    )
  }
  return raw
}

export function parseConfigFile(input: unknown): ConfigFile {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ProduxError("Config must be a JSON object.")
  }
  const result = configV1.safeParse(migrate(input as Record<string, unknown>))
  if (!result.success) {
    throw new ProduxError(
      result.error.issues.map((i) => {
        const path = i.path.join(".") || "(root)"
        const keys = "keys" in i && Array.isArray(i.keys) ? ` ${i.keys.join(", ")}` : ""
        return `Config: ${path}: ${i.message}${keys}`
      })
    )
  }
  return result.data
}

const ORDER = ["$schema", "schemaVersion", "mode", "packageManager", "preset", "features", "ui", "workspace", "examples"]

export function serializeConfig(config: ConfigFile): string {
  const sorted: Record<string, unknown> = {}
  for (const key of ORDER) {
    const value = config[key as keyof ConfigFile]
    if (value === undefined) continue
    sorted[key] = key === "features" ? [...(value as string[])].sort((a, b) => FEATURE_IDS.indexOf(a) - FEATURE_IDS.indexOf(b)) : value
  }
  return `${JSON.stringify(sorted, null, 2)}\n`
}
