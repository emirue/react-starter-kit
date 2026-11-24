import { FEATURES } from "./features.ts"

export type PresetId = "minimal" | "standard" | "admin" | "enterprise" | "custom"

export interface PresetDef {
  id: PresetId
  name: string
  description: string
  features: string[]
}

const MINIMAL = ["eslint"]

const STANDARD = [
  "tailwind",
  "lucide",
  "shadcn",
  "theme",
  "tanstack-query",
  "tanstack-query-devtools",
  "zustand",
  "react-router",
  "axios",
  "react-hook-form",
  "zod",
  "hookform-resolvers",
  "vitest",
  "testing-library",
  "eslint",
  "prettier",
  "claude-md",
  "agents-md",
]

const ADMIN = [...STANDARD, "tanstack-table", "admin-layout"]

const ENTERPRISE = [...ADMIN, "orval", "msw", "playwright", "docker", "github-actions", "codeql", "env-validation", "error-boundary"]

export const PRESETS: PresetDef[] = [
  { id: "minimal", name: "Minimal", description: "React, Vite, TypeScript and ESLint", features: MINIMAL },
  { id: "standard", name: "Standard", description: "A production-ready SPA stack (recommended)", features: STANDARD },
  { id: "admin", name: "Admin", description: "Standard plus an admin dashboard layout and data table", features: ADMIN },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Admin plus Orval, MSW, Playwright, Docker, CI and CodeQL",
    features: ENTERPRISE,
  },
  { id: "custom", name: "Custom", description: "Start from Standard and pick features yourself", features: STANDARD },
]

/** A preset is offered only when every feature in it is validated. */
export function isPresetAvailable(preset: PresetDef): boolean {
  return preset.features.every((id) => !FEATURES.find((f) => f.id === id)?.unverified)
}

export function getPreset(id: PresetId): PresetDef {
  const preset = PRESETS.find((p) => p.id === id)
  if (!preset) throw new Error(`Unknown preset: ${id}`)
  return preset
}
