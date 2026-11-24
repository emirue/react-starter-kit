import type { ProjectConfig } from "./resolve-config.ts"

/**
 * Flags available to `@if` in templates: every selected feature id plus the
 * derived flags below. Keep this list short; templates read better with ids.
 */
export function contextFlags(config: ProjectConfig): Set<string> {
  const f = new Set(config.features)
  const has = (...ids: string[]) => ids.some((id) => f.has(id))
  const derived: [string, boolean][] = [
    ["examples", config.examples],
    ["standalone", config.mode === "standalone"],
    ["workspace", config.mode !== "standalone"],
    ["new-monorepo", config.mode === "monorepo"],
    ["existing-workspace", config.mode === "existing-workspace"],
    ["turbo", config.workspace?.turbo === true],
    [`pm-${config.packageManager}`, true],
    ["ui-base", has("shadcn") && config.ui.base === "base"],
    ["ui-radix", has("shadcn") && config.ui.base === "radix"],
    ["router", has("react-router", "tanstack-router")],
    ["api-client", has("fetch", "axios")],
    ["providers", has("tanstack-query", "theme", "admin-layout")],
    ["forms-example", has("hookform-resolvers")],
  ]
  const usesUi = has("theme") || (config.examples && has("tanstack-query", "hookform-resolvers", "zustand"))
  derived.push(["ui-primitives", !has("shadcn") && usesUi])
  derived.push([
    "example-pages",
    config.examples && has("react-router", "tanstack-router") && has("tanstack-query", "hookform-resolvers", "zustand"),
  ])
  for (const [flag, on] of derived) if (on) f.add(flag)
  return f
}
