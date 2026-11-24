import * as p from "@clack/prompts"

import type { PackageManager } from "../adapters/package-manager.ts"
import { FEATURES, type FeatureGroup } from "../core/features.ts"
import { getPreset, isPresetAvailable, PRESETS, type PresetId } from "../core/presets.ts"
import type { WorkspaceInfo } from "../core/workspace.ts"
import { validatePackageName } from "../utils/project-name.ts"
import type { CliOptions } from "./options.ts"

export class CancelledError extends Error {
  constructor() {
    super("Operation cancelled.")
  }
}

async function ask<T>(prompt: Promise<T>): Promise<Exclude<T, symbol>> {
  const value = await prompt
  if (p.isCancel(value)) throw new CancelledError()
  return value as Exclude<T, symbol>
}

// Empty input means "use the default value", which is valid.
const nameValidator = (v: string | undefined) => (v ? validatePackageName(v.split(/[\\/]/).pop() ?? "") : undefined)

const GROUPS: { group: FeatureGroup; label: string }[] = [
  { group: "ui", label: "UI and styling" },
  { group: "state", label: "State management" },
  { group: "forms", label: "Forms and tables" },
  { group: "testing", label: "Testing" },
  { group: "quality", label: "Code quality" },
  { group: "infra", label: "Infrastructure" },
  { group: "ai", label: "AI development" },
  { group: "app", label: "Application" },
]

/** Asks only for what the command line and config file did not decide. Returns explicit options. */
export async function promptForOptions(
  o: CliOptions,
  ctx: { detected?: WorkspaceInfo; defaultPm: PackageManager; filePreset?: PresetId; fileFeatures?: string[] }
): Promise<CliOptions> {
  const next: CliOptions = { ...o }

  next.mode ??= await ask(
    p.select({
      message: "Project structure",
      initialValue: ctx.detected ? "existing-workspace" : "standalone",
      options: [
        { value: "standalone", label: "Standalone application" },
        { value: "monorepo", label: "New monorepo workspace", hint: "pnpm workspaces" },
        {
          value: "existing-workspace",
          label: "Add to existing monorepo",
          hint: ctx.detected ? `detected at ${ctx.detected.root}` : "no workspace detected here",
        },
      ],
    })
  )

  if (next.mode === "existing-workspace") {
    next.appName ??= await ask(
      p.text({ message: "Application name", placeholder: "web", defaultValue: next.dir ?? "web", validate: nameValidator })
    )
    next.appDir ??= await ask(
      p.text({
        message: "Application directory (relative to the workspace root)",
        defaultValue: `apps/${next.appName}`,
        placeholder: `apps/${next.appName}`,
      })
    )
  } else {
    next.dir ??= await ask(
      p.text({
        message: next.mode === "monorepo" ? "Project directory" : "Project name",
        placeholder: next.mode === "monorepo" ? "my-project" : "my-app",
        defaultValue: next.mode === "monorepo" ? "my-project" : "my-app",
        validate: nameValidator,
      })
    )
    if (next.mode === "monorepo") {
      next.appName ??= await ask(p.text({ message: "Application name", placeholder: "web", defaultValue: "web", validate: nameValidator }))
    }
  }

  if (next.mode === "standalone") {
    next.packageManager ??= await ask(
      p.select<PackageManager>({
        message: "Package manager",
        initialValue: ctx.defaultPm,
        options: [
          { value: "pnpm", label: "pnpm", hint: "recommended" },
          { value: "npm", label: "npm" },
          { value: "yarn", label: "Yarn" },
          { value: "bun", label: "Bun" },
        ],
      })
    )
  } else if (next.mode === "monorepo") {
    next.packageManager ??= "pnpm"
    next.turbo ??= await ask(
      p.select({
        message: "Workspace configuration",
        initialValue: true,
        options: [
          { value: true, label: "Workspace + Turborepo", hint: "task caching and ordering" },
          { value: false, label: "Workspace only" },
        ],
      })
    )
  }

  if (!next.preset && !ctx.filePreset && !next.features) {
    next.preset = await ask(
      p.select<PresetId>({
        message: "Project preset",
        initialValue: "standard",
        options: PRESETS.filter(isPresetAvailable).map((x) => ({
          value: x.id,
          label: x.id === "standard" ? `${x.name} (recommended)` : x.name,
          hint: x.description,
        })),
      })
    )
  }

  const preset = next.preset ?? ctx.filePreset ?? "standard"
  const customize =
    !next.features && (preset === "custom" || (await ask(p.confirm({ message: "Customize the preset's features?", initialValue: false }))))
  if (customize) {
    const base = new Set(next.preset ? getPreset(preset).features : (ctx.fileFeatures ?? getPreset(preset).features))
    const chosen: string[] = []
    const router = await ask(
      p.select({
        message: "Routing",
        initialValue: base.has("tanstack-router") ? "tanstack-router" : base.has("react-router") ? "react-router" : "none",
        options: [
          { value: "none", label: "None" },
          { value: "react-router", label: "React Router" },
          { value: "tanstack-router", label: "TanStack Router" },
        ],
      })
    )
    if (router !== "none") chosen.push(router)
    const http = await ask(
      p.select({
        message: "API client",
        initialValue: base.has("axios") ? "axios" : base.has("fetch") ? "fetch" : "none",
        options: [
          { value: "none", label: "None" },
          { value: "fetch", label: "Native Fetch" },
          { value: "axios", label: "Axios" },
        ],
      })
    )
    if (http !== "none") chosen.push(http)
    const api = await ask(
      p.multiselect({
        message: "API tooling",
        required: false,
        initialValues: ["orval", "vite-proxy"].filter((id) => base.has(id)),
        options: [
          { value: "orval", label: "Orval", hint: "typed client from OpenAPI" },
          { value: "vite-proxy", label: "Vite dev proxy" },
        ].filter((o) => !FEATURES.find((f) => f.id === o.value)?.unverified),
      })
    )
    chosen.push(...api)
    for (const { group, label } of GROUPS) {
      const options = FEATURES.filter((f) => f.group === group && !f.unverified && (!f.modes || f.modes.includes(next.mode!)))
      if (!options.length) continue
      chosen.push(
        ...(await ask(
          p.multiselect({
            message: label,
            required: false,
            initialValues: options.filter((f) => base.has(f.id)).map((f) => f.id),
            options: options.map((f) => ({ value: f.id, label: f.name, hint: f.description })),
          })
        ))
      )
    }
    const ws = FEATURES.filter((f) => f.group === "workspace" && next.mode !== "standalone")
    if (ws.length) {
      chosen.push(
        ...(await ask(
          p.multiselect({
            message: "Shared workspace packages",
            required: false,
            initialValues: [],
            options: ws.map((f) => ({ value: f.id, label: f.name, hint: f.description })),
          })
        ))
      )
    }
    next.features = chosen
    next.preset = "custom"
    if (chosen.includes("shadcn") && !next.ui) {
      next.ui = await ask(
        p.select({
          message: "shadcn/ui primitives",
          initialValue: "base" as const,
          options: [
            { value: "base" as const, label: "Base UI", hint: "shadcn default" },
            { value: "radix" as const, label: "Radix UI" },
          ],
        })
      )
    }
  }

  next.examples ??= await ask(
    p.select({
      message: "Example code",
      initialValue: true,
      options: [
        { value: true, label: "Include example features" },
        { value: false, label: "Clean starter without examples" },
      ],
    })
  )
  if (next.saveConfig === undefined && !next.dryRun) {
    if (await ask(p.confirm({ message: "Save this configuration (produx.config.json) for future use?", initialValue: false }))) {
      next.saveConfig = true
    }
  }
  return next
}
